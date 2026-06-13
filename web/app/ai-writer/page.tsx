"use client";

import { useState } from "react";

// Design tokens — consistent with app-wide palette
const C = {
  bg: "#0B0C10",
  surface: "#13141A",
  card: "#1A1C24",
  border: "#272933",
  muted: "#3A3D4A",
  textDim: "#6B7080",
  textMid: "#A0A6B8",
  text: "#E8EAF0",
  accent: "#7C6EF8",
  accent2: "#4FD1A0",
  accent3: "#F4955C",
  danger: "#F06070",
};

const OUTPUT_TYPES = [
  { value: "caption", label: "Caption", desc: "Social media caption + hashtags" },
  { value: "script", label: "Script", desc: "Video script dengan hook & CTA" },
  { value: "hook", label: "Hook", desc: "Satu kalimat pembuka yang kuat" },
  { value: "thread", label: "Thread", desc: "Twitter/X thread multi-tweet" },
  { value: "blog", label: "Blog", desc: "Artikel blog lengkap" },
  { value: "email", label: "Email", desc: "Email dengan subject & body" },
  { value: "ad_copy", label: "Ad Copy", desc: "Iklan dengan headline & CTA" },
  { value: "other", label: "Lainnya", desc: "Format bebas sesuai prompt" },
];

const TONES = [
  { value: "", label: "Default" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "hype", label: "Hype" },
  { value: "educational", label: "Edukatif" },
  { value: "persuasive", label: "Persuasif" },
];

const LANGUAGES = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];

export default function AIWriterPage() {
  const [outputType, setOutputType] = useState("caption");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("id");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

      if (!res.ok) {
        setError(data.error || "Generate gagal. Coba lagi.");
        return;
      }

      setResult(data.output_text);
      setTokensUsed(data.tokens_used);
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, #5B4FD8)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>✍️</div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18 }}>AI Writer</div>
          <div style={{ fontSize: 12, color: C.textDim }}>Generate konten dengan Gemini</div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Output type selector */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
            Jenis Konten
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
            {OUTPUT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setOutputType(t.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${outputType === t.value ? C.accent : C.border}`,
                  backgroundColor: outputType === t.value ? `${C.accent}18` : C.card,
                  color: outputType === t.value ? C.accent : C.textMid,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tone + Language */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Tone
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: `1px solid ${tone === t.value ? C.accent : C.border}`,
                    backgroundColor: tone === t.value ? `${C.accent}18` : "transparent",
                    color: tone === t.value ? C.accent : C.textMid,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Bahasa
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  style={{
                    padding: "5px 16px",
                    borderRadius: 20,
                    border: `1px solid ${language === l.value ? C.accent2 : C.border}`,
                    backgroundColor: language === l.value ? `${C.accent2}18` : "transparent",
                    color: language === l.value ? C.accent2 : C.textMid,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Prompt <span style={{ color: C.danger }}>*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Deskripsikan konten yang ingin di-generate...${selectedType ? `\n\nContoh untuk ${selectedType.label}: ...` : ""}`}
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              backgroundColor: C.card,
              color: C.text,
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "Inter, sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.accent; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
          />
        </div>

        {/* Context (optional) */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textMid, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
            Context <span style={{ color: C.textDim, textTransform: "none", fontWeight: 400 }}>(opsional)</span>
          </label>
          <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8 }}>
            Info tambahan: nama brand, target audience, produk yang dipromosikan, dll.
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Contoh: Brand skincare lokal, target usia 18-25 tahun, produk: serum vitamin C Rp 150rb..."
            rows={2}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              backgroundColor: C.card,
              color: C.text,
              fontSize: 13,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "Inter, sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.muted; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            padding: "13px 24px",
            borderRadius: 10,
            border: "none",
            backgroundColor: loading || !prompt.trim() ? C.muted : C.accent,
            color: loading || !prompt.trim() ? C.textDim : "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.15s",
            width: "100%",
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff", borderRadius: "50%",
                display: "inline-block", animation: "spin 0.7s linear infinite",
              }} />
              Generating...
            </>
          ) : (
            `Generate ${selectedType?.label ?? "Konten"}`
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: `${C.danger}15`,
            border: `1px solid ${C.danger}40`,
            color: C.danger,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{
            borderRadius: 12,
            border: `1px solid ${C.accent}30`,
            backgroundColor: C.card,
            overflow: "hidden",
          }}>
            {/* Result header */}
            <div style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: C.accent2, fontWeight: 600 }}>✓ Selesai</span>
                {tokensUsed && (
                  <span style={{ fontSize: 11, color: C.textDim, backgroundColor: C.surface, padding: "2px 8px", borderRadius: 20 }}>
                    {tokensUsed.toLocaleString()} tokens
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  backgroundColor: copied ? `${C.accent2}18` : "transparent",
                  color: copied ? C.accent2 : C.textMid,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>

            {/* Result text */}
            <div style={{
              padding: "20px",
              fontSize: 14,
              lineHeight: 1.8,
              color: C.text,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {result}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: ${C.textDim}; }
        textarea { color-scheme: dark; }
      `}</style>
    </div>
  );
}
