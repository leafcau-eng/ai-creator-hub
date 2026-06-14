#!/usr/bin/env python3
"""
video_trim.py — Phase 7A.1
Trim video dari Supabase Storage via FFmpeg, upload hasil, callback webhook.

Dipanggil oleh video-trim.yml GitHub Actions workflow.

Usage:
  python video_trim.py <job_id> <asset_path> <start_time> <end_time>

Env vars required:
  SUPABASE_URL       — Supabase project URL
  SUPABASE_SERVICE_KEY — Service role key (bypass RLS)
  WEBHOOK_SECRET     — Secret untuk header x-webhook-secret
  WEBHOOK_URL        — Full URL ke /api/webhook (prod)

Webhook payload yang dikirim:
  { "job_type": "video_trim", "job_id": "...", "status": "processing"|"completed"|"failed",
    "output_path": "video-trims/{job_id}/output.mp4",   ← hanya kalau completed
    "error_message": "..."                               ← hanya kalau failed }

Status yang dipakai (sesuai job_status enum):
  queued → processing → completed | failed
  (tidak ada 'pending' atau 'done' di enum)
"""

import sys
import os
import subprocess
import tempfile
import requests
from supabase import create_client

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

SUPABASE_URL   = os.environ['SUPABASE_URL']
SUPABASE_KEY   = os.environ['SUPABASE_SERVICE_KEY']
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')
WEBHOOK_URL    = os.environ.get('WEBHOOK_URL', '')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def send_webhook(job_id: str, status: str, output_path: str = None, error: str = None):
    """POST callback ke /api/webhook dengan job_type='video_trim'."""
    if not WEBHOOK_URL:
        print(f'[webhook] WEBHOOK_URL tidak di-set, skip')
        return

    payload = {
        'job_type': 'video_trim',
        'job_id': job_id,
        'status': status,
    }
    if output_path:
        payload['output_path'] = output_path
    if error:
        payload['error_message'] = error

    try:
        res = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={'x-webhook-secret': WEBHOOK_SECRET},
            timeout=15,
        )
        print(f'[webhook] {res.status_code} — {res.text[:200]}')
    except Exception as e:
        print(f'[webhook] Gagal kirim: {e}')


def update_job_direct(job_id: str, status: str, error: str = None):
    """
    Fallback update langsung ke Supabase jika webhook tidak ter-set.
    Tetap dipanggil untuk status 'processing' agar UI bisa polling.
    """
    data: dict = {'status': status}
    if error:
        data['error_message'] = error
    try:
        supabase.table('video_jobs').update(data).eq('id', job_id).execute()
        print(f'[supabase] video_jobs.status → {status}')
    except Exception as e:
        print(f'[supabase] Gagal update status: {e}')


def fail(job_id: str, message: str):
    """Update status failed + kirim webhook + exit."""
    print(f'[trim] FAIL: {message}')
    update_job_direct(job_id, 'failed', message)
    send_webhook(job_id, 'failed', error=message)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 5:
        print('Usage: python video_trim.py <job_id> <asset_path> <start_time> <end_time>')
        sys.exit(1)

    job_id     = sys.argv[1]
    asset_path = sys.argv[2]   # Storage path, e.g. "clips/project_id/clip_1.mp4"
    start_time = float(sys.argv[3])
    end_time   = float(sys.argv[4])
    duration   = end_time - start_time

    print(f'[trim] START job_id={job_id} path={asset_path} start={start_time} end={end_time} duration={duration}')

    # ── 1. Update status → processing ──
    update_job_direct(job_id, 'processing')
    send_webhook(job_id, 'processing')

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path  = os.path.join(tmpdir, 'input.mp4')
        output_path = os.path.join(tmpdir, 'output.mp4')

        # ── 2. Generate signed URL untuk download source ──
        print(f'[trim] Generating signed URL...')
        try:
            signed = supabase.storage.from_('assets').create_signed_url(asset_path, 600)
            # Supabase Python SDK mengembalikan dict dengan 'signedURL' atau 'signedUrl'
            download_url = signed.get('signedURL') or signed.get('signedUrl')
            if not download_url:
                fail(job_id, f'Signed URL kosong — response: {signed}')
        except Exception as e:
            fail(job_id, f'Gagal generate signed URL: {e}')

        # ── 3. Download video ──
        print(f'[trim] Downloading video...')
        try:
            r = requests.get(download_url, timeout=300, stream=True)
            r.raise_for_status()
            with open(input_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=65536):
                    f.write(chunk)
            print(f'[trim] Download selesai: {os.path.getsize(input_path):,} bytes')
        except Exception as e:
            fail(job_id, f'Gagal download video: {e}')

        # ── 4. FFmpeg trim ──
        # -ss sebelum -i → fast seek (keyframe-accurate, cepat, tanpa re-encode)
        # -t  → durasi output (bukan end time)
        # -c copy → stream copy, tidak re-encode
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-i', input_path,
            '-t', str(duration),
            '-c', 'copy',
            output_path
        ]
        print(f'[trim] FFmpeg: {" ".join(ffmpeg_cmd)}')
        try:
            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
                timeout=600
            )
            if result.returncode != 0:
                # Ambil 500 char terakhir stderr untuk error message
                stderr_tail = result.stderr[-500:] if result.stderr else '(no stderr)'
                fail(job_id, f'FFmpeg exit {result.returncode}: {stderr_tail}')
        except subprocess.TimeoutExpired:
            fail(job_id, 'FFmpeg timeout (>600s)')
        except Exception as e:
            fail(job_id, f'FFmpeg error: {e}')

        output_size = os.path.getsize(output_path)
        print(f'[trim] FFmpeg selesai: {output_size:,} bytes')

        if output_size == 0:
            fail(job_id, 'FFmpeg output kosong (0 bytes)')

        # ── 5. Upload hasil ke Supabase Storage ──
        # Path: video-trims/{job_id}/output.mp4
        storage_output_path = f'video-trims/{job_id}/output.mp4'
        print(f'[trim] Upload ke {storage_output_path}...')
        try:
            with open(output_path, 'rb') as f:
                supabase.storage.from_('assets').upload(
                    storage_output_path,
                    f,
                    file_options={'content-type': 'video/mp4', 'upsert': 'true'}
                )
            print(f'[trim] Upload selesai')
        except Exception as e:
            fail(job_id, f'Gagal upload ke storage: {e}')

    # ── 6. Callback webhook → completed ──
    # (di luar with block agar tmpdir sudah cleanup)
    send_webhook(job_id, 'completed', output_path=storage_output_path)
    print(f'[trim] Job selesai: {storage_output_path}')


if __name__ == '__main__':
    main()
