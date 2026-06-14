#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Patch Item 12 — Cancel Upload (AbortController + cleanup)
# Jalankan dari: ~/ai-creator-hub-new/web
# Usage: bash patch-item12-cancel-upload.sh
# ============================================================

set -e

FILE="app/page.jsx"

if [ ! -f "$FILE" ]; then
  echo "❌ File $FILE tidak ditemukan. Jalankan dari folder web/"
  exit 1
fi

cp "$FILE" "$FILE.bak.item12"
echo "✅ Backup dibuat: $FILE.bak.item12"

# ------------------------------------------------------------
# STEP 1: Tambah ref map untuk simpan XHR aktif per uploadId
# Disisipkan tepat sebelum "const updateUpload = (uploadId, patch) => {"
# ------------------------------------------------------------
python3 - "$FILE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

anchor = "  const updateUpload = (uploadId, patch) => {"
if anchor not in src:
    print("❌ Anchor 'updateUpload' tidak ditemukan. STEP 1 dibatalkan.")
    sys.exit(1)

inject = '''  // Map uploadId -> XMLHttpRequest aktif (untuk cancel)
  const activeXhrRef = useRef({});

''' + anchor

src = src.replace(anchor, inject, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 1 selesai: activeXhrRef ditambahkan")
PYEOF

# ------------------------------------------------------------
# STEP 2: Simpan xhr ke activeXhrRef saat dibuat, hapus saat selesai/error
# ------------------------------------------------------------
python3 - "$FILE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

old = '''      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateUpload(uploadId, { progress: pct });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload gagal (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload gagal — koneksi error"));

        xhr.send(file);
      });'''

new = '''      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);

        activeXhrRef.current[uploadId] = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateUpload(uploadId, { progress: pct });
          }
        };

        xhr.onload = () => {
          delete activeXhrRef.current[uploadId];
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload gagal (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => {
          delete activeXhrRef.current[uploadId];
          reject(new Error("Upload gagal — koneksi error"));
        };
        xhr.onabort = () => {
          delete activeXhrRef.current[uploadId];
          reject(new Error("__CANCELLED__"));
        };

        xhr.send(file);
      });'''

if old not in src:
    print("❌ Blok XHR upload tidak ditemukan. STEP 2 dibatalkan.")
    sys.exit(1)

src = src.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 2 selesai: activeXhrRef diisi + handler onabort")
PYEOF

# ------------------------------------------------------------
# STEP 3: catch block — handle "__CANCELLED__" supaya tidak tampil sebagai error,
# dan tambah fungsi cancelUpload
# ------------------------------------------------------------
python3 - "$FILE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

old = '''    } catch (err) {
      console.error("[asset-upload] error:", err);
      updateUpload(uploadId, { status: "error", error: err.message || "Upload gagal" });

      // Rollback row kalau sudah ke-insert
      const current = uploads.find((u) => u.id === uploadId);
      const assetId = current?.assetId;
      if (assetId) {
        try {
          await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
        } catch (delErr) {
          console.error("[asset-upload] rollback error:", delErr);
        }
      }
    }
  };

  const retryUpload = (uploadId) => {'''

new = '''    } catch (err) {
      delete activeXhrRef.current[uploadId];

      const wasCancelled = err?.message === "__CANCELLED__";

      // Rollback row kalau sudah ke-insert (berlaku untuk cancel maupun error)
      const current = uploads.find((u) => u.id === uploadId);
      const assetId = current?.assetId;
      if (assetId) {
        try {
          await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
        } catch (delErr) {
          console.error("[asset-upload] rollback error:", delErr);
        }
      }

      if (wasCancelled) {
        // User membatalkan upload — hapus dari list, tidak perlu ditampilkan sebagai error
        removeUpload(uploadId);
        return;
      }

      console.error("[asset-upload] error:", err);
      updateUpload(uploadId, { status: "error", error: err.message || "Upload gagal" });
    }
  };

  const cancelUpload = (uploadId) => {
    const xhr = activeXhrRef.current[uploadId];
    if (xhr) {
      xhr.abort(); // -> onabort -> reject("__CANCELLED__") -> catch block di atas
    } else {
      // Belum sempat ada xhr aktif (masih request signed URL) — langsung remove
      removeUpload(uploadId);
    }
  };

  const retryUpload = (uploadId) => {'''

if old not in src:
    print("❌ Blok catch/retryUpload tidak ditemukan. STEP 3 dibatalkan.")
    sys.exit(1)

src = src.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 3 selesai: cancelUpload() ditambahkan + catch block handle cancel")
PYEOF

# ------------------------------------------------------------
# STEP 4: Tambah tombol Cancel di JSX progress list (saat status uploading)
# ------------------------------------------------------------
python3 - "$FILE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

old = '''                  ) : u.status === "done" ? (
                    <span style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600 }}>Done</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{u.progress}%</span>
                  )}'''

new = '''                  ) : u.status === "done" ? (
                    <span style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600 }}>Done</span>
                  ) : (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{u.progress}%</span>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                        onClick={() => cancelUpload(u.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}'''

if old not in src:
    print("❌ Blok JSX progress (Done/percentage) tidak ditemukan. STEP 4 dibatalkan.")
    sys.exit(1)

src = src.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 4 selesai: tombol Cancel ditambahkan di progress list")
PYEOF

echo ""
echo "============================================================"
echo "✅ Patch Item 12 selesai."
echo "Next steps:"
echo "  1. npm run build"
echo "  2. Lolos -> git add app/page.jsx && git commit -m 'feat: cancel upload (Item 12)' && git push origin main"
echo "  3. Error -> cp app/page.jsx.bak.item12 app/page.jsx"
echo "============================================================"
