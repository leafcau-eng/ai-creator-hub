// ============================================================
// REPLACE fungsi ImageStudioPage() yang ada di page.jsx
// (dari baris `function ImageStudioPage() {` sampai closing `}` sebelum `function VideoStudioPage`)
//
// PASTE seluruh blok ini sebagai pengganti fungsi tersebut.
// ============================================================

function ImageStudioPage() {
  // ── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("generate"); // "generate" | "history" | "edit"

  // Generate tab
  const [prompt, setPrompt]               = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle]                 = useState("");
  const [aspectRatio, setAspectRatio]     = useState("1:1");
  const [numOutputs, setNumOutputs]       = useState(1);
  const [generating, setGenerating]       = useState(false);
  const [genError, setGenError]           = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]); // [{assetId, signedUrl, width, height}]
  const [lastProvider, setLastProvider]   = useState(null);

  // History tab
  const [history, setHistory]             = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Edit tab
  const [editAssetId, setEditAssetId]     = useState(null);
  const [editImageUrl, setEditImageUrl]   = useState(null);
  const [editImageW, setEditImageW]       = useState(0);
  const [editImageH, setEditImageH]       = useState(0);
  const [editOp, setEditOp]               = useState("crop"); // "crop" | "resize"
  const [cropParams, setCropParams]       = useState({ x: 0, y: 0, width: 512, height: 512 });
  const [resizeParams, setResizeParams]   = useState({ width: 512, height: 512 });
  const [editing, setEditing]             = useState(false);
  const [editError, setEditError]         = useState(null);
  const [editResult, setEditResult]       = useState(null); // {assetId, signedUrl, width, height}

  const STYLES = [
    { key: "cinematic",    label: "Cinematic" },
    { key: "realistic",    label: "Realistic" },
    { key: "illustration", label: "Illustration" },
    { key: "anime",        label: "Anime" },
    { key: "sketch",       label: "Sketch" },
    { key: "3d",           label: "3D Render" },
  ];

  const RATIOS = ["1:1", "16:9", "9:16", "4:3"];

  // ── Fetch history ──────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("image_jobs")
        .select("id, prompt, style, aspect_ratio, status, ai_provider_used, ai_model_used, created_at, output_asset_ids")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setHistory(data);
    } catch (err) {
      console.error("[ImageStudio] fetch history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  // ── Generate ───────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedImages([]);
    setLastProvider(null);
    try {
      const res = await fetch("/api/image-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          style: style || undefined,
          aspectRatio,
          numOutputs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Generate gagal. Coba lagi.");
        return;
      }
      setGeneratedImages(data.images ?? []);
      setLastProvider(data.providerUsed ?? null);
    } catch {
      setGenError("Network error. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Send gambar ke Edit tab ────────────────────────────────
  const openInEdit = (img) => {
    setEditAssetId(img.assetId);
    setEditImageUrl(img.signedUrl);
    setEditImageW(img.width);
    setEditImageH(img.height);
    setCropParams({ x: 0, y: 0, width: img.width, height: img.height });
    setResizeParams({ width: img.width, height: img.height });
    setEditResult(null);
    setEditError(null);
    setActiveTab("edit");
  };

  // ── Edit ───────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editAssetId) return;
    setEditing(true);
    setEditError(null);
    setEditResult(null);
    try {
      const body =
        editOp === "crop"
          ? { assetId: editAssetId, operation: "crop", crop: cropParams }
          : { assetId: editAssetId, operation: "resize", resize: resizeParams };

      const res = await fetch("/api/image-studio/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Edit gagal. Coba lagi.");
        return;
      }
      setEditResult(data);
    } catch {
      setEditError("Network error. Coba lagi.");
    } finally {
      setEditing(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const statusColor = (s) => {
    if (s === "completed") return "var(--accent2)";
    if (s === "failed")    return "var(--danger)";
    if (s === "processing") return "var(--accent)";
    return "var(--text-dim)";
  };

  // ── Styles ─────────────────────────────────────────────────
  const panelStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--r-lg)",
    padding: 20,
  };

  const numberInput = (value, onChange, min = 1, max = 2048) => (
    <input
      type="number"
      className="form-input"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
      style={{ width: 90 }}
    />
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>
          Image Studio
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Generate gambar dengan AI, edit, dan simpan ke Asset Library.
        </div>
      </div>

      {/* Tab bar */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { id: "generate", label: "Generate" },
          { id: "history",  label: "History" },
          { id: "edit",     label: "Edit" },
        ].map((t) => (
          <div
            key={t.id}
            className={`tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* ── TAB: Generate ─────────────────────────────────── */}
      {activeTab === "generate" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left: controls */}
          <div style={panelStyle}>
            <SectionHeader title="Prompt" />

            <div className="form-group">
              <label className="form-label">Describe your image</label>
              <textarea
                className="form-input"
                placeholder="A cinematic shot of a futuristic city at night, neon lights, rain…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={{ height: 100, resize: "vertical" }}
                disabled={generating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Negative prompt <span style={{ color: "var(--text-dim)", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
              <input
                className="form-input"
                placeholder="blurry, low quality, watermark…"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                disabled={generating}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Style</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STYLES.map((s) => (
                  <div
                    key={s.key}
                    onClick={() => !generating && setStyle(style === s.key ? "" : s.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "99px",
                      border: `1px solid ${style === s.key ? "var(--accent)" : "var(--border)"}`,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: generating ? "default" : "pointer",
                      background: style === s.key ? "rgba(124,110,248,.15)" : "var(--surface)",
                      color: style === s.key ? "var(--accent)" : "var(--text-dim)",
                      transition: "all .15s",
                    }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Aspect ratio</label>
              <div style={{ display: "flex", gap: 8 }}>
                {RATIOS.map((r) => (
                  <div
                    key={r}
                    onClick={() => !generating && setAspectRatio(r)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: generating ? "default" : "pointer",
                      background: aspectRatio === r ? "var(--accent)" : "var(--surface)",
                      color: aspectRatio === r ? "#fff" : "var(--text-dim)",
                      transition: "all .15s",
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Number of images</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 4].map((n) => (
                  <div
                    key={n}
                    onClick={() => !generating && setNumOutputs(n)}
                    style={{
                      padding: "7px 20px",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: generating ? "default" : "pointer",
                      background: numOutputs === n ? "var(--accent)" : "var(--surface)",
                      color: numOutputs === n ? "#fff" : "var(--text-dim)",
                      transition: "all .15s",
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>

            {genError && (
              <div style={{
                background: "rgba(240,96,112,.1)",
                border: "1px solid rgba(240,96,112,.3)",
                borderRadius: "var(--r-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--danger)",
                marginBottom: 16,
              }}>
                {genError}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              style={{ width: "100%", justifyContent: "center", padding: 11, opacity: !prompt.trim() ? 0.5 : 1 }}
            >
              {generating ? (
                <>
                  <span style={{
                    display: "inline-block",
                    width: 14, height: 14,
                    border: "2px solid rgba(255,255,255,.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin .7s linear infinite",
                  }} />
                  Generating…
                </>
              ) : (
                <>
                  <Icon d={icons.sparkle} size={14} />
                  Generate
                </>
              )}
            </button>

            {lastProvider && !generating && (
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>
                via {lastProvider}
              </div>
            )}
          </div>

          {/* Right: output */}
          <div style={panelStyle}>
            <SectionHeader title="Output" />
            {generating ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 360, gap: 14 }}>
                <div style={{
                  width: 40, height: 40,
                  border: "3px solid var(--border)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "50%",
                  animation: "spin .8s linear infinite",
                }} />
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Generating your image…</div>
              </div>
            ) : generatedImages.length === 0 ? (
              <EmptyState
                icon="image"
                title="No image yet"
                desc="Fill in your prompt and hit Generate."
              />
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: generatedImages.length === 1 ? "1fr" : "1fr 1fr",
                gap: 10,
              }}>
                {generatedImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <img
                      src={img.signedUrl}
                      alt={`Generated ${i + 1}`}
                      style={{ width: "100%", display: "block", objectFit: "cover" }}
                    />
                    {/* Hover actions */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,.55)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: 0, transition: "opacity .15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                    >
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "6px 12px", background: "rgba(255,255,255,.1)", borderColor: "rgba(255,255,255,.2)", color: "#fff" }}
                        onClick={() => openInEdit(img)}
                      >
                        Edit
                      </button>
                      <a
                        href={img.signedUrl}
                        download={`image_${i + 1}.png`}
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "6px 12px", background: "rgba(255,255,255,.1)", borderColor: "rgba(255,255,255,.2)", color: "#fff", textDecoration: "none" }}
                      >
                        Download
                      </a>
                    </div>
                    <div style={{ padding: "6px 8px", fontSize: 10, color: "var(--text-dim)" }}>
                      {img.width} × {img.height}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {generatedImages.length > 0 && !generating && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>
                {generatedImages.length} gambar tersimpan di Asset Library ✓
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: History ──────────────────────────────────── */}
      {activeTab === "history" && (
        <div style={panelStyle}>
          <SectionHeader title="Generation history" action="Refresh" onAction={fetchHistory} />
          {historyLoading ? (
            <LoadingSkeleton />
          ) : history.length === 0 ? (
            <EmptyState icon="image" title="Belum ada history" desc="Generate gambar pertamamu di tab Generate." />
          ) : (
            <div>
              {history.map((job) => (
                <div key={job.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 0", borderBottom: "1px solid var(--border)",
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: statusColor(job.status),
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {job.prompt}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {job.style && (
                        <span className="tag tag-purple">{job.style}</span>
                      )}
                      {job.aspect_ratio && (
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{job.aspect_ratio}</span>
                      )}
                      {job.ai_provider_used && (
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>via {job.ai_provider_used}</span>
                      )}
                      <span style={{ fontSize: 11, color: statusColor(job.status), fontWeight: 500, textTransform: "capitalize" }}>
                        {job.status}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>·</span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{timeAgo(job.created_at)}</span>
                    </div>
                  </div>
                  {job.output_asset_ids?.length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>
                      {job.output_asset_ids.length} gambar
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Edit ─────────────────────────────────────── */}
      {activeTab === "edit" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left: edit controls */}
          <div style={panelStyle}>
            <SectionHeader title="Edit image" />

            {!editAssetId ? (
              <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "40px 0", textAlign: "center", lineHeight: 1.8 }}>
                Generate gambar dulu di tab Generate,<br />
                lalu klik <strong style={{ color: "var(--text)" }}>Edit</strong> pada gambar tersebut.
              </div>
            ) : (
              <>
                {/* Preview original */}
                {editImageUrl && (
                  <div style={{ marginBottom: 16, borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
                    <img src={editImageUrl} alt="Original" style={{ width: "100%", display: "block" }} />
                    <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--text-dim)" }}>
                      Original: {editImageW} × {editImageH}px
                    </div>
                  </div>
                )}

                {/* Op selector */}
                <div className="form-group">
                  <label className="form-label">Operation</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["crop", "resize"].map((op) => (
                      <div
                        key={op}
                        onClick={() => setEditOp(op)}
                        style={{
                          padding: "7px 20px", borderRadius: "var(--r-sm)",
                          border: "1px solid var(--border)", fontSize: 12, fontWeight: 500,
                          cursor: "pointer",
                          background: editOp === op ? "var(--accent)" : "var(--surface)",
                          color: editOp === op ? "#fff" : "var(--text-dim)",
                          textTransform: "capitalize",
                          transition: "all .15s",
                        }}
                      >
                        {op}
                      </div>
                    ))}
                  </div>
                </div>

                {editOp === "crop" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Crop area (pixels)</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          ["X offset", "x", 0, editImageW],
                          ["Y offset", "y", 0, editImageH],
                          ["Width",    "width",  1, editImageW],
                          ["Height",   "height", 1, editImageH],
                        ].map(([label, key, min, max]) => (
                          <div key={key}>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>{label}</div>
                            <input
                              type="number"
                              className="form-input"
                              value={cropParams[key]}
                              min={min}
                              max={max}
                              onChange={(e) => setCropParams((prev) => ({
                                ...prev,
                                [key]: Math.max(Number(min), Math.min(Number(max), Number(e.target.value))),
                              }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {editOp === "resize" && (
                  <div className="form-group">
                    <label className="form-label">Target size (pixels)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Width</div>
                        <input
                          type="number"
                          className="form-input"
                          value={resizeParams.width}
                          min={1}
                          max={4096}
                          onChange={(e) => setResizeParams((p) => ({ ...p, width: Number(e.target.value) }))}
                          style={{ width: 100 }}
                        />
                      </div>
                      <div style={{ color: "var(--text-dim)", marginTop: 18 }}>×</div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Height</div>
                        <input
                          type="number"
                          className="form-input"
                          value={resizeParams.height}
                          min={1}
                          max={4096}
                          onChange={(e) => setResizeParams((p) => ({ ...p, height: Number(e.target.value) }))}
                          style={{ width: 100 }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                      Preset: {" "}
                      {[
                        { label: "1080p", w: 1920, h: 1080 },
                        { label: "720p",  w: 1280, h: 720 },
                        { label: "Square 512", w: 512, h: 512 },
                      ].map((p) => (
                        <span
                          key={p.label}
                          onClick={() => setResizeParams({ width: p.w, height: p.h })}
                          style={{ marginRight: 8, cursor: "pointer", color: "var(--accent)", textDecoration: "underline" }}
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {editError && (
                  <div style={{
                    background: "rgba(240,96,112,.1)",
                    border: "1px solid rgba(240,96,112,.3)",
                    borderRadius: "var(--r-md)",
                    padding: "10px 14px",
                    fontSize: 13, color: "var(--danger)", marginBottom: 16,
                  }}>
                    {editError}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleEdit}
                  disabled={editing}
                  style={{ width: "100%", justifyContent: "center", padding: 11 }}
                >
                  {editing ? (
                    <>
                      <span style={{
                        display: "inline-block", width: 14, height: 14,
                        border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff",
                        borderRadius: "50%", animation: "spin .7s linear infinite",
                      }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Icon d={icons.check} size={14} />
                      Save as new asset
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Right: edit result */}
          <div style={panelStyle}>
            <SectionHeader title="Result" />
            {!editResult ? (
              <EmptyState
                icon="image"
                title="Hasil edit muncul di sini"
                desc="Atur crop atau resize lalu klik Save as new asset."
              />
            ) : (
              <div>
                <div style={{ borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--border)", marginBottom: 12 }}>
                  <img src={editResult.signedUrl} alt="Edited" style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
                  {editResult.width} × {editResult.height}px · Tersimpan di Asset Library ✓
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={editResult.signedUrl}
                    download="edited_image.png"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, textDecoration: "none" }}
                  >
                    Download
                  </a>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      setEditAssetId(editResult.assetId);
                      setEditImageUrl(editResult.signedUrl);
                      setEditImageW(editResult.width);
                      setEditImageH(editResult.height);
                      setCropParams({ x: 0, y: 0, width: editResult.width, height: editResult.height });
                      setResizeParams({ width: editResult.width, height: editResult.height });
                      setEditResult(null);
                    }}
                  >
                    Edit lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin keyframe (tambahkan ke CSS global jika belum ada) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
