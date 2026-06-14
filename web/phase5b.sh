#!/usr/bin/env python3
# phase5b.sh — Phase 5B: GET /api/ai-writer + Recent Documents di AIWriterPage

import os, sys

WEB = os.path.expanduser("~/ai-creator-hub-new/web")

# ─── 1. GET /api/ai-writer ───────────────────────────────────────────────────

route_path = os.path.join(WEB, "app/api/ai-writer/route.ts")
if not os.path.exists(route_path):
    print("ERROR: route.ts tidak ditemukan"); sys.exit(1)

with open(route_path, "r") as f:
    route = f.read()

if "export async function GET" in route:
    print("INFO: GET handler sudah ada di route.ts, skip.")
else:
    GET_HANDLER = '''
export async function GET() {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: jobs, error } = await supabase
      .from("ai_writer_jobs")
      .select("id, output_type, prompt, status, output_text, ai_provider_used, ai_model_used, tokens_used, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Fetch ai_writer_jobs failed:", error);
      return NextResponse.json({ error: "Gagal fetch history" }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/ai-writer:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
'''
    with open(route_path, "r") as f:
        content = f.read()
    with open(route_path + ".bak", "w") as f:
        f.write(content)
    with open(route_path, "a") as f:
        f.write(GET_HANDLER)
    print("✓ GET /api/ai-writer ditambahkan ke route.ts")

# ─── 2. Patch AIWriterPage di page.jsx ───────────────────────────────────────

page_path = os.path.join(WEB, "app/page.jsx")
if not os.path.exists(page_path):
    print("ERROR: page.jsx tidak ditemukan"); sys.exit(1)

with open(page_path, "r") as f:
    page = f.read()

# Marker: akhir AIWriterPage sebelum AssetLibraryPage
END_MARKER = "function AssetLibraryPage()"
if END_MARKER not in page:
    print("ERROR: marker AssetLibraryPage tidak ditemukan"); sys.exit(1)

START_MARKER = "function AIWriterPage()"
if START_MARKER not in page:
    print("ERROR: marker AIWriterPage tidak ditemukan"); sys.exit(1)

start_idx = page.index(START_MARKER)
end_idx   = page.index(END_MARKER)
old_func  = page[start_idx:end_idx]

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

  // Recent docs
  const [docs, setDocs]           = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [activeDocId, setActiveDocId] = useState(null);

  useEffect(() => {
    fetch("/api/ai-writer")
      .then((r) => r.json())
      .then((d) => setDocs(d.jobs ?? []))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, []);

  function refetchDocs() {
    fetch("/api/ai-writer")
      .then((r) => r.json())
      .then((d) => setDocs(d.jobs ?? []))
      .catch(() => {});
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setTokensUsed(null);
    setCopied(false);
    setActiveDocId(null);
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
      refetchDocs();
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDoc(doc) {
    setResult(doc.output_text);
    setTokensUsed(doc.tokens_used ?? null);
    setActiveDocId(doc.id);
    setError(null);
    setCopied(false);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedType = OUTPUT_TYPES.find((t) => t.value === outputType);

  const chipStyle = (active, color = "var(--accent)") => ({
    padding: "5px 12px", borderRadius: 20,
    border: `1px solid ${active ? color : "var(--border)"}`,
    backgroundColor: active ? `${color}22` : "transparent",
    color: active ? color : "var(--text-mid)",
    cursor: "pointer", fontSize: 12, fontWeight: 500,
    transition: "all 0.15s", whiteSpace: "nowrap",
  });

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  const TYPE_COLOR = {
    caption: "var(--accent)", script: "#4E9BF4", hook: "var(--accent2)",
    thread: "var(--accent3)", blog: "#C084FC", email: "#F472B6",
    ad_copy: "var(--danger)", other: "var(--text-dim)",
  };

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

        {/* Output type */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Jenis Konten</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {OUTPUT_TYPES.map((t) => (
              <button key={t.value} onClick={() => setOutputType(t.value)} style={{
                padding: "10px 12px", borderRadius: "var(--r-sm)",
                border: `1px solid ${outputType === t.value ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: outputType === t.value ? "rgba(124,110,248,.12)" : "var(--card)",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: outputType === t.value ? "var(--accent)" : "var(--text)" }}>{t.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tone + Language */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Tone</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TONES.map((t) => <button key={t.value} onClick={() => setTone(t.value)} style={chipStyle(tone === t.value)}>{t.label}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Bahasa</div>
            <div style={{ display: "flex", gap: 6 }}>
              {LANGUAGES.map((l) => <button key={l.value} onClick={() => setLanguage(l.value)} style={chipStyle(language === l.value, "var(--accent2)")}>{l.label}</button>)}
            </div>
          </div>
        </div>

        {/* Prompt */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Prompt <span style={{ color: "var(--danger)" }}>*</span>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Deskripsikan konten yang ingin di-generate...\nContoh untuk ${selectedType?.label}: topik, angle, target audience...`}
            rows={4} style={{
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

        {/* Context */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            Context <span style={{ color: "var(--text-dim)", textTransform: "none", fontWeight: 400, fontSize: 11 }}>(opsional)</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>Info tambahan: nama brand, target audience, produk, dll.</div>
          <textarea value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="Contoh: Brand skincare lokal, target usia 18-25, produk: serum vitamin C Rp150rb..."
            rows={2} style={{
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

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={loading || !prompt.trim()} style={{
          padding: "13px 24px", borderRadius: "var(--r-md)", border: "none",
          backgroundColor: loading || !prompt.trim() ? "var(--muted)" : "var(--accent)",
          color: loading || !prompt.trim() ? "var(--text-dim)" : "#fff",
          fontWeight: 700, fontSize: 15,
          cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s", width: "100%",
        }}>
          {loading ? (
            <><span style={{
              width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)",
              borderTopColor: "#fff", borderRadius: "50%",
              display: "inline-block", animation: "spin 0.7s linear infinite",
            }} />Generating...</>
          ) : `Generate ${selectedType?.label ?? "Konten"}`}
        </button>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: "var(--r-md)",
            backgroundColor: "rgba(240,96,112,.1)", border: "1px solid rgba(240,96,112,.3)",
            color: "var(--danger)", fontSize: 14, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icon d={icons.zap} size={15} /> {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ borderRadius: "var(--r-lg)", border: `1px solid ${activeDocId ? "rgba(79,209,160,.25)" : "rgba(124,110,248,.25)"}`, backgroundColor: "var(--card)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon d={icons.check} size={14} stroke="var(--accent2)" />
                <span style={{ fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>
                  {activeDocId ? "Dari history" : "Selesai"}
                </span>
                {tokensUsed && (
                  <span style={{ fontSize: 11, color: "var(--text-dim)", backgroundColor: "var(--surface)", padding: "2px 8px", borderRadius: 20 }}>
                    {tokensUsed.toLocaleString()} tokens
                  </span>
                )}
              </div>
              <button onClick={handleCopy} style={{
                padding: "5px 14px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                backgroundColor: copied ? "rgba(79,209,160,.12)" : "transparent",
                color: copied ? "var(--accent2)" : "var(--text-mid)",
                cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all 0.15s",
              }}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ padding: 20, fontSize: 14, lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {result}
            </div>
          </div>
        )}

        {/* Recent Documents */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-mid)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            Recent Documents
          </div>

          {docsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3].map((i) => (
                <div key={i} style={{ height: 60, borderRadius: "var(--r-md)", backgroundColor: "var(--card)", border: "1px solid var(--border)", opacity: 0.5 }} />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
              <div style={{ marginBottom: 8 }}><Icon d={icons.writer} size={28} stroke="var(--text-dim)" /></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-mid)", marginBottom: 4 }}>No documents yet</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Generate konten di atas untuk mulai.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {docs.map((doc) => (
                <button key={doc.id} onClick={() => handleLoadDoc(doc)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: "var(--r-md)",
                  border: `1px solid ${activeDocId === doc.id ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: activeDocId === doc.id ? "rgba(124,110,248,.08)" : "var(--card)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s", width: "100%",
                }}
                  onMouseEnter={(e) => { if (activeDocId !== doc.id) e.currentTarget.style.borderColor = "var(--muted)"; }}
                  onMouseLeave={(e) => { if (activeDocId !== doc.id) e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  {/* Type badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, flexShrink: 0,
                    backgroundColor: `${TYPE_COLOR[doc.output_type] ?? "var(--text-dim)"}22`,
                    color: TYPE_COLOR[doc.output_type] ?? "var(--text-dim)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {doc.output_type}
                  </span>
                  {/* Prompt preview */}
                  <span style={{ fontSize: 13, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.prompt}
                  </span>
                  {/* Meta */}
                  <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>
                    {doc.tokens_used ? `${doc.tokens_used} tkn · ` : ""}{timeAgo(doc.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
"""

with open(page_path + ".bak", "w") as f:
    f.write(page)
print("✓ Backup page.jsx dibuat")

new_page = page[:start_idx] + NEW_FUNC + "\n" + page[end_idx:]
with open(page_path, "w") as f:
    f.write(new_page)

# Verifikasi
with open(page_path, "r") as f:
    v = f.read()
checks = ["handleLoadDoc", "refetchDocs", "docsLoading", "timeAgo", "Recent Documents", "activeDocId"]
ok = all(c in v for c in checks)
if ok:
    print("✓ AIWriterPage Phase 5B berhasil dipatch")
    print("\nSUKSES: Jalankan: npm run build && git add app/ && git commit -m 'feat(ai-writer): phase 5b recent documents' && git push")
else:
    print("ERROR: verifikasi gagal")
    for c in checks:
        if c not in v: print("  MISSING:", c)
    sys.exit(1)
