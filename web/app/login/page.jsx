'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0B0C10;
    color: #E8EAF0;
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
  }

  .wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background:
      radial-gradient(ellipse at 65% 15%, rgba(124,110,248,.15) 0%, transparent 55%),
      radial-gradient(ellipse at 15% 85%, rgba(79,209,160,.08) 0%, transparent 50%),
      #0B0C10;
  }

  .card {
    background: #13141A;
    border: 1px solid #272933;
    border-radius: 20px;
    padding: 48px 40px;
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  .logo {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, #7C6EF8 0%, #4E9BF4 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
  }

  .title {
    font-family: 'Syne', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: #fff;
    margin-bottom: 8px;
    letter-spacing: -.02em;
  }

  .subtitle {
    font-size: 14px;
    color: #6B7080;
    margin-bottom: 40px;
    line-height: 1.6;
  }

  .btn-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 13px 20px;
    background: #1A1C24;
    border: 1px solid #272933;
    border-radius: 10px;
    color: #E8EAF0;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all .15s;
    font-family: 'Inter', sans-serif;
    margin-bottom: 12px;
  }

  .btn-google:hover:not(:disabled) {
    background: #1E2030;
    border-color: #7C6EF8;
    color: #fff;
  }

  .btn-google:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .error-box {
    background: rgba(240,96,112,.1);
    border: 1px solid rgba(240,96,112,.25);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #F06070;
    margin-bottom: 16px;
    text-align: left;
  }

  .footer {
    margin-top: 32px;
    font-size: 12px;
    color: #3A3D4A;
    line-height: 1.7;
  }
`

const IconLayers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
)

const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.09 0-3.85-1.41-4.48-3.3H1.83v2.07A8 8 0 008.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.51A4.8 4.8 0 014.25 9c0-.52.09-1.03.25-1.51V5.42H1.83A8 8 0 001 9c0 1.3.31 2.52.83 3.58l2.67-2.07z"/>
    <path fill="#EA4335" d="M8.98 3.58c1.18 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.42L4.5 7.49C5.13 5.6 6.89 3.58 8.98 3.58z"/>
  </svg>
)

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cek kalau ada error dari callback
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err && !error) setError('Login gagal. Coba lagi.')
  }

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="card">
          <div className="logo">
            <IconLayers />
          </div>

          <div className="title">Studioflow</div>
          <p className="subtitle">
            Platform AI untuk kreator konten.<br />
            Masuk untuk mulai.
          </p>

          {error && (
            <div className="error-box">⚠️ {error}</div>
          )}

          <button
            className="btn-google"
            onClick={handleGoogle}
            disabled={loading}
          >
            {loading ? (
              <>
                <span style={{ width: 18, height: 18, border: '2px solid #3A3D4A', borderTopColor: '#7C6EF8', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                Menghubungkan...
              </>
            ) : (
              <>
                <IconGoogle />
                Masuk dengan Google
              </>
            )}
          </button>

          <p className="footer">
            Dengan masuk, kamu menyetujui<br />
            Syarat Layanan dan Kebijakan Privasi kami.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
