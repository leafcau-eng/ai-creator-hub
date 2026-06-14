#!/usr/bin/env python3
# patch-ai-writer.sh — jalankan dengan: python3 patch-ai-writer.sh
# Otomatis replace AIWriterPage() di app/page.jsx

import os, sys

TARGET = os.path.expanduser("~/ai-creator-hub-new/web/app/page.jsx")

if not os.path.exists(TARGET):
    print("ERROR: file tidak ditemukan:", TARGET)
    sys.exit(1)

with open(TARGET, "r") as f:
    content = f.read()

# Guard: pastikan marker ada
if "function AIWriterPage()" not in content:
    print("ERROR: 'function AIWriterPage()' tidak ditemukan di file.")
    sys.exit(1)

if "function AssetLibraryPage()" not in content:
    print("ERROR: 'function AssetLibraryPage()' tidak ditemukan di file.")
    sys.exit(1)

# Backup
with open(TARGET + ".bak", "w") as f:
    f.write(content)
print("Backup dibuat:", TARGET + ".bak")

NEW_FUNC = r"""function AIWriterPage() {
  const OUTPUT_TYPES = [
    { value: "caption",  label: "Caption",   desc: "Social media caption + hashtags" },
    { value: "script",   label: "Script",    desc: "Video script dengan hook & CTA" },
    { value: "hook",     label: "Hook",      desc: "Satu kalimat pembuka yang kuat" },
    { value: "thread",   label: "Thread",    desc: "Twitter/X thread multi-tweet" },
    { value: "blog",     label: "Blog",      desc: "Artikel blog lengkap" },
    { value: "email",    label: "Email",     desc: "Email dengan subject & body" },
    { value: "ad_copy",  label: "Ad Copy",   desc: "Iklan dengan headline & CTA" },
    { value: "other",    label: "Lainnya",   desc: "Format bebas sesuai prompt" },
  ];
  const TONES = [
    { value: "",            label: "Default" },
    { value: "casual",      label: "Casual" },
    { value: "formal",      label: "Formal" },
    { value: "hype",        label: "Hype" },
    { value: "educational", label: "Edukatif" },
    { value: "persuasive",  label: "Persuasif" },
  ];
  const LANGUAGES = [
    { value: "id", label: "Indonesia" },
    { value: "en", label: "English" },
  ];

  const [outputType, setOutputType] = useState("caption");
  const [tone, setTone]             = useState("");
  const [language, setLanguage]     = useState("id");
  const [prompt, setPrompt]         = useState("");
  const [context, setContext]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [tokensUsed, setTokensUsed] = useState(null);
  const [error, setError]           = useState(null);
  const [copied, setCopied]         = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setTokensUsed(null);
    setCopied(false);
    try {
      const res = await fetch("/api/ai-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output_type: outputType,
          prompt: prompt.trim(),
          context: context.trim() || undefined,
          tone: tone || undefined,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Generate gagal. Coba lagi."); return; }
      setResult(data.output_text);
      setTokensUsed(data.tokens_used ?? null);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedType = OUTPUT_TYPES.find((t) => t.value === outputType);

  const chipStyle = (active, color = "var(--accent)") => ({
    padding: "5px 12px",
    borderRadius: 20,
    border: `1px solid ${active ? color : "var(--border)"}`,
    backgroundColor: active ? `${color}22` : "transparent",
    color: active ? color : "var(--text-mid)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "var(--r-sm)",
          background: "linear-gradient(135deg, var(--accent), #5B4FD8)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}>
          <Icon d={icons.writer} size={18} />
        </div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--white)", marginBottom: 2 }}>AI Writer</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Generate konten dengan Gemini</div>
        </div>
      </div>

      <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 20 }}>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Jenis Konten</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {OUTPUT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setOutputType(t.value)}
                style={{
                  padding: "10px 12px", borderRadius: "var(--r-sm)",
                  border: `1px solid ${outputType === t.value ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: outputType === t.value ? "rgba(124,110,248,.12)" : "var(--card)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: outputType === t.value ? "var(--accent)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Tone</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TONES.map((t) => (
                <button key={t.value} onClick={() => setTone(t.value)} style={chipStyle(tone === t.value)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Bahasa</div>
            <div style={{ display: "flex", gap: 6 }}>
              {LANGUAGES.map((l) => (
                <button key={l.value} onClick={() => setLanguage(l.value)} style={chipStyle(language === l.value, "var(--accent2)")}>{l.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Prompt <span style={{ color: "var(--danger)" }}>*</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Deskripsikan konten yang ingin di-generate...\nContoh untuk ${selectedType?.label}: topik, angle, target audience...`}
            rows={4}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border)", backgroundColor: "var(--card)",
              color: "var(--text)", fontSize: 14, lineHeight: 1.6,
              resize: "vertical", outline: "none", boxSizing: "border-box",
              fontFamily: "Inter, sans-serif", transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Context <span style={{ color: "var(--text-dim)", textTransform: "none", fontWeight: 400, fontSize: 11 }}>(opsional)</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>Info tambahan: nama brand, target audience, produk, dll.</div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Contoh: Brand skincare lokal, target usia 18-25, produk: serum vitamin C Rp150rb..."
            rows={2}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "var(--r-md)",
              border: "1px solid var(--border)", backgroundColor: "var(--card)",
              color: "var(--text)", fontSize: 13, lineHeight: 1.6,
              resize: "vertical", outline: "none", boxSizing: "border-box",
              fontFamily: "Inter, sans-serif", transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--muted)"; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            padding: "13px 24px", borderRadius: "var(--r-md)", border: "none",
            backgroundColor: loading || !prompt.trim() ? "var(--muted)" : "var(--accent)",
            color: loading || !prompt.trim() ? "var(--text-dim)" : "#fff",
            fontWeight: 700, fontSize: 15,
            cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.15s", width: "100%",
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)",
                borderTopColor: "#fff", borderRadius: "50%",
                display: "inline-block", animation: "spin 0.7s linear infinite",
              }} />
              Generating...
            </>
          ) : (
            `Generate ${selectedType?.label ?? "Konten"}`
          )}
        </button>

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: "var(--r-md)",
            backgroundColor: "rgba(240,96,112,.1)", border: "1px solid rgba(240,96,112,.3)",
            color: "var(--danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icon d={icons.zap} size={15} /> {error}
          </div>
        )}

        {result && (
          <div style={{
            borderRadius: "var(--r-lg)", border: "1px solid rgba(124,110,248,.25)",
            backgroundColor: "var(--card)", overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d={icons.check} size={14} stroke="var(--accent2)" />
                <span style={{ fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>Selesai</span>
                {tokensUsed && (
                  <span style={{ fontSize: 11, color: "var(--text-dim)", backgroundColor: "var(--surface)", padding: "2px 8px", borderRadius: 20 }}>
                    {tokensUsed.toLocaleString()} tokens
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: "5px 14px", borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  backgroundColor: copied ? "rgba(79,209,160,.12)" : "transparent",
                  color: copied ? "var(--accent2)" : "var(--text-mid)",
                  cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s",
                }}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ padding: 20, fontSize: 14, lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {result}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
"""

# Potong dari "function AIWriterPage()" sampai tepat sebelum "function AssetLibraryPage()"
start_marker = "function AIWriterPage()"
end_marker   = "function AssetLibraryPage()"

start_idx = content.index(start_marker)
end_idx   = content.index(end_marker)

new_content = content[:start_idx] + NEW_FUNC + "\n" + content[end_idx:]

with open(TARGET, "w") as f:
    f.write(new_content)

print("SUKSES: AIWriterPage() berhasil diganti.")
print("Verifikasi dengan: grep -n 'function AIWriterPage\\|OUTPUT_TYPES\\|handleGenerate' ~/ai-creator-hub-new/web/app/page.jsx | head -5")
