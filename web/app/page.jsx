"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:   "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  image:       "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z M3 9h18M3 9l3-6M21 9l-3-6",
  video:       "M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z",
  clip:        "M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z M12 17v-6M9 14l3 3 3-3",
  writer:      "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  library:     "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z",
  workflow:    "M22 12h-4l-3 9L9 3l-3 9H2",
  settings:    "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  bell:        "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  search:      "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  plus:        "M12 5v14M5 12h14",
  chevronDown: "M6 9l6 6 6-6",
  menu:        "M3 12h18M3 6h18M3 18h18",
  sparkle:     "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",
  upload:      "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  zap:         "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  layers:      "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  check:       "M20 6L9 17l-5-5",
  close:       "M18 6L6 18M6 6l12 12",
  externalLink:"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
};

// ── Design tokens ──────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0B0C10;
    --surface:   #13141A;
    --card:      #1A1C24;
    --border:    #272933;
    --muted:     #3A3D4A;
    --text-dim:  #6B7080;
    --text-mid:  #A0A6B8;
    --text:      #E8EAF0;
    --white:     #FFFFFF;
    --accent:    #7C6EF8;
    --accent2:   #4FD1A0;
    --accent3:   #F4955C;
    --danger:    #F06070;
    --r-sm:      6px;
    --r-md:      10px;
    --r-lg:      14px;
    --r-xl:      20px;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; overflow: hidden; }

  /* Layout */
  .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

  /* Sidebar */
  .sidebar {
    width: 220px; min-width: 220px; background: var(--surface);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    padding: 0; overflow: hidden; transition: width .2s ease;
  }
  .sidebar.collapsed { width: 64px; min-width: 64px; }

  .sidebar-logo {
    display: flex; align-items: center; gap: 10px; padding: 18px 16px 16px;
    border-bottom: 1px solid var(--border);
  }
  .logo-mark {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent) 0%, #4E9BF4 100%);
    display: flex; align-items: center; justify-content: center;
  }
  .logo-text { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: var(--white); white-space: nowrap; overflow: hidden; }

  .sidebar-section { padding: 12px 0; flex: 1; overflow-y: auto; }
  .sidebar-label { font-size: 10px; font-weight: 600; letter-spacing: .08em; color: var(--text-dim); text-transform: uppercase; padding: 6px 16px 4px; white-space: nowrap; overflow: hidden; }

  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 14px; margin: 1px 8px;
    border-radius: var(--r-md); cursor: pointer; color: var(--text-mid);
    transition: background .15s, color .15s; position: relative; white-space: nowrap;
  }
  .nav-item:hover { background: var(--card); color: var(--text); }
  .nav-item.active { background: rgba(124,110,248,.14); color: var(--accent); }
  .nav-item.active .nav-dot { background: var(--accent); }
  .nav-label { font-size: 13.5px; font-weight: 500; overflow: hidden; }
  .nav-badge { margin-left: auto; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; border-radius: 99px; padding: 1px 6px; }

  .sidebar-footer { padding: 12px 8px; border-top: 1px solid var(--border); }
  .user-row { display: flex; align-items: center; gap: 9px; padding: 8px 8px; border-radius: var(--r-md); cursor: pointer; }
  .user-row:hover { background: var(--card); }
  .avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#7C6EF8,#4E9BF4); flex-shrink:0; display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff; }
  .user-name { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; }
  .user-role { font-size: 11px; color: var(--text-dim); white-space: nowrap; }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  /* Header */
  .header {
    height: 56px; min-height: 56px; background: var(--surface); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 20px; gap: 12px;
  }
  .header-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--white); flex: 1; }
  .search-bar {
    display: flex; align-items: center; gap: 8px; background: var(--card);
    border: 1px solid var(--border); border-radius: var(--r-md); padding: 7px 12px;
    width: 220px; color: var(--text-dim); cursor: text; transition: border-color .15s;
  }
  .search-bar:hover { border-color: var(--muted); }
  .search-bar span { font-size: 13px; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px;
    border-radius: var(--r-md); font-size: 13px; font-weight: 500; cursor: pointer;
    border: none; transition: all .15s; white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: #8E82FA; }
  .btn-ghost { background: transparent; color: var(--text-mid); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--card); color: var(--text); }
  .btn-icon { padding: 7px; border-radius: var(--r-md); background: var(--card); border: 1px solid var(--border); color: var(--text-mid); cursor: pointer; display: flex; align-items:center; justify-content:center; transition: all .15s; }
  .btn-icon:hover { background: var(--muted); color: var(--text); }

  /* Content */
  .content { flex: 1; overflow-y: auto; padding: 28px; }

  /* Cards */
  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 20px; }
  .card-sm { padding: 14px 16px; }

  /* Stats row */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px 20px; }
  .stat-label { font-size: 12px; color: var(--text-dim); font-weight: 500; margin-bottom: 6px; }
  .stat-value { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; color: var(--white); letter-spacing: -.02em; }
  .stat-sub { font-size: 12px; color: var(--accent2); margin-top: 4px; }
  .stat-sub.warn { color: var(--accent3); }

  /* Grid */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

  /* Empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 20px; text-align: center; gap: 12px;
  }
  .empty-icon { width: 56px; height: 56px; border-radius: var(--r-xl); background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-dim); }
  .empty-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .empty-desc { font-size: 13px; color: var(--text-dim); max-width: 280px; line-height: 1.6; }

  /* Activity list */
  .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-top: 5px; flex-shrink: 0; }
  .activity-dot.green { background: var(--accent2); }
  .activity-dot.orange { background: var(--accent3); }
  .activity-text { font-size: 13px; color: var(--text-mid); }
  .activity-text strong { color: var(--text); font-weight: 500; }
  .activity-time { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

  /* Quick actions */
  .quick-actions { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .quick-action {
    background: var(--card); border: 1px solid var(--border); border-radius: var(--r-lg);
    padding: 18px 16px; cursor: pointer; transition: all .15s; text-align: left;
    display: flex; flex-direction: column; gap: 10px;
  }
  .quick-action:hover { border-color: var(--accent); background: rgba(124,110,248,.06); }
  .qa-icon { width: 36px; height: 36px; border-radius: var(--r-sm); display: flex; align-items:center; justify-content:center; }
  .qa-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .qa-desc { font-size: 12px; color: var(--text-dim); }

  /* Section header */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .section-title { font-size: 14px; font-weight: 600; color: var(--text); }

  /* Loading skeleton */
  @keyframes shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
  .skeleton {
    background: linear-gradient(90deg, var(--card) 25%, var(--muted) 50%, var(--card) 75%);
    background-size: 400px 100%; animation: shimmer 1.4s infinite; border-radius: var(--r-sm);
  }

  /* Tag / badge */
  .tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 500; }
  .tag-purple { background: rgba(124,110,248,.15); color: #A99CF6; }
  .tag-green { background: rgba(79,209,160,.15); color: var(--accent2); }
  .tag-orange { background: rgba(244,149,92,.15); color: var(--accent3); }

  /* Settings form */
  .form-group { margin-bottom: 20px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--text-mid); margin-bottom: 6px; display:block; text-transform: uppercase; letter-spacing: .04em; }
  .form-input {
    width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--text);
    padding: 9px 12px; border-radius: var(--r-md); font-size: 13px; font-family: inherit; outline: none;
    transition: border-color .15s;
  }
  .form-input:focus { border-color: var(--accent); }
  .toggle { width: 40px; height: 22px; border-radius: 11px; background: var(--muted); cursor: pointer; position: relative; transition: background .2s; flex-shrink:0; }
  .toggle.on { background: var(--accent); }
  .toggle::after { content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition: left .2s; }
  .toggle.on::after { left: 21px; }
  .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom: 1px solid var(--border); }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-info .toggle-name { font-size:13px; font-weight:500; color:var(--text); }
  .toggle-info .toggle-desc { font-size:12px; color:var(--text-dim); margin-top:2px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 99px; }

  /* Page fade */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .page { animation: fadeIn .2s ease; }

  /* Workflow nodes */
  .workflow-canvas { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 40px; min-height: 320px; position: relative; overflow: hidden; }
  .workflow-node { display: inline-flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: var(--r-md); padding: 10px 16px; font-size: 13px; font-weight: 500; cursor: default; }
  .workflow-arrow { color: var(--text-dim); margin: 0 4px; font-size: 18px; }

  /* Tab bar */
  .tabs { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 3px; margin-bottom: 20px; width: fit-content; }
  .tab { padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 500; color: var(--text-dim); cursor: pointer; transition: all .15s; }
  .tab.active { background: var(--card); color: var(--text); }

  /* Progress bar */
  .progress-bar { height: 4px; background: var(--border); border-radius: 99px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), #4E9BF4); }

  /* Notification dot */
  .notif-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--danger); border: 1.5px solid var(--surface); position: absolute; top: 6px; right: 6px; }
`;

// ── Nav config ────────────────────────────────────────────────────────────────
const navItems = [
  { id: "dashboard",  label: "Dashboard",          icon: "dashboard" },
  { id: "image",      label: "Image Studio",        icon: "image" },
  { id: "video",      label: "Video Studio",        icon: "video" },
  { id: "clipper",    label: "Auto Clipper",         icon: "clip" },
  { id: "writer",     label: "AI Writer",            icon: "writer", badge: "AI" },
  { id: "library",    label: "Asset Library",        icon: "library" },
  { id: "workflow",   label: "Workflow Automation",  icon: "workflow" },
  { id: "settings",   label: "Settings",             icon: "settings" },
];

// ── Components ────────────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon d={icons[icon]} size={24} />
      </div>
      <div className="empty-title">{title}</div>
      <p className="empty-desc">{desc}</p>
      {action && (
        <button className="btn btn-primary" onClick={onAction} style={{ marginTop: 4 }}>
          <Icon d={icons.plus} size={14} /> {action}
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[80, 65, 90, 55].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: `${w}%` }} />
      ))}
    </div>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="section-header">
      <span className="section-title">{title}</span>
      {action && (
        <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const [stats, setStats] = useState({ projects: 0, clips: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const supabase = createClient();

        // Fetch semua sekaligus
        const [projectsRes, clipsRes, recentRes] = await Promise.all([
          supabase.from("projects").select("id", { count: "exact", head: true }),
          supabase.from("clip_results").select("id", { count: "exact", head: true }),
          supabase.from("projects")
            .select("id, title, status, current_step, source_url, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setStats({
          projects: projectsRes.count || 0,
          clips:    clipsRes.count    || 0,
        });

        if (recentRes.data) setRecentProjects(recentRes.data);
      } catch (err) {
        console.error("[dashboard] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const statusColor = (status) => {
    if (status === "completed") return "var(--accent2)";
    if (status === "failed")    return "var(--danger)";
    if (status === "processing" || status === "queued") return "var(--accent)";
    return "var(--text-dim)";
  };

  const statusLabel = (status, current_step) => {
    if (status === "completed")  return "Completed";
    if (status === "failed")     return "Failed";
    if (status === "queued")     return "Queued";
    if (status === "processing" && current_step) return current_step.replace(/_/g, " ");
    if (status === "processing") return "Processing";
    return status || "Pending";
  };

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

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>
          Good morning ✦
        </div>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Here's what's happening in your workspace today.</div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          {
            label: "Total Clips",
            value: loading ? "—" : String(stats.clips),
            sub:   stats.clips > 0 ? `from ${stats.projects} project${stats.projects !== 1 ? "s" : ""}` : "No clips yet",
            cls:   "",
          },
          {
            label: "Videos Created",
            value: loading ? "—" : String(stats.projects),
            sub:   stats.projects > 0 ? "Auto Clipper projects" : "Start your first one",
            cls:   "",
          },
          {
            label: "AI Words Used",
            value: "0",
            sub:   "Out of 100k / mo",
            cls:   "warn",
          },
          {
            label: "Workflows Run",
            value: "0",
            sub:   "No runs yet",
            cls:   "",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-sub ${s.cls}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <div className="quick-actions">
        {[
          { icon: "image",    color: "#7C6EF8", bg: "rgba(124,110,248,.15)", title: "New image",     desc: "Generate or edit" },
          { icon: "video",    color: "#4E9BF4", bg: "rgba(78,155,244,.15)",  title: "New video",     desc: "Create from scratch" },
          { icon: "writer",   color: "#4FD1A0", bg: "rgba(79,209,160,.15)",  title: "Write content", desc: "Blog, captions, scripts" },
          { icon: "workflow", color: "#F4955C", bg: "rgba(244,149,92,.15)",  title: "New workflow",  desc: "Automate tasks" },
        ].map((q) => (
          <div key={q.title} className="quick-action">
            <div className="qa-icon" style={{ background: q.bg, color: q.color }}>
              <Icon d={icons[q.icon]} size={18} />
            </div>
            <div>
              <div className="qa-title">{q.title}</div>
              <div className="qa-desc">{q.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two col */}
      <div className="two-col">
        {/* Recent activity */}
        <div className="card">
          <SectionHeader title="Recent projects" />
          {loading ? (
            <LoadingSkeleton />
          ) : recentProjects.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
              No projects yet. Go to Auto Clipper to start.
            </div>
          ) : (
            <div>
              {recentProjects.map((p) => (
                <div key={p.id} className="activity-item">
                  <div className="activity-dot" style={{ background: statusColor(p.status) }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="activity-text">
                      <strong>{p.title || "Untitled"}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: statusColor(p.status), fontWeight: 500, textTransform: "capitalize" }}>
                        {statusLabel(p.status, p.current_step)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>·</span>
                      <span className="activity-time">{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Storage — static sampai Phase 4 */}
        <div className="card">
          <SectionHeader title="Storage" />
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-mid)" }}>Used</span>
              <span style={{ fontSize: 13, color: "var(--text)" }}>0 GB / 10 GB</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "0%" }} />
            </div>
          </div>
          {[
            { label: "Images", used: "0 MB", color: "var(--accent)" },
            { label: "Videos", used: "0 MB", color: "#4E9BF4" },
            { label: "Audio",  used: "0 MB", color: "var(--accent2)" },
            { label: "Other",  used: "0 MB", color: "var(--accent3)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text-mid)", flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{s.used}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function ImageStudioPage() {
  return (
    <div className="page">
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div className="tabs">
          {["Generate", "Edit", "Upscale", "Remove BG"].map((t, i) => (
            <div key={t} className={`tab${i === 0 ? " active" : ""}`}>{t}</div>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary"><Icon d={icons.sparkle} size={14} /> Generate image</button>
        </div>
      </div>

      <div className="two-col">
        <div className="card" style={{ minHeight: 400 }}>
          <SectionHeader title="Prompt" />
          <textarea
            placeholder="Describe the image you want to create…"
            className="form-input"
            style={{ height: 120, resize: "vertical", marginBottom: 16 }}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {["Photorealistic", "Illustration", "Anime", "3D Render", "Sketch"].map((s) => (
              <span key={s} className="tag tag-purple" style={{ cursor: "pointer" }}>{s}</span>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Aspect ratio</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["1:1", "16:9", "9:16", "4:3"].map((r, i) => (
                <div key={r} style={{
                  padding: "7px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  background: i === 0 ? "var(--accent)" : "var(--surface)",
                  color: i === 0 ? "#fff" : "var(--text-dim)",
                }}>{r}</div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 11 }}>
            <Icon d={icons.sparkle} size={14} /> Generate
          </button>
        </div>

        <div className="card" style={{ minHeight: 400 }}>
          <SectionHeader title="Output" />
          <EmptyState icon="image" title="No image generated yet" desc="Fill in your prompt and hit Generate to create your first image." />
        </div>
      </div>
    </div>
  );
}

function VideoStudioPage() {
  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <div className="tabs">
          {["Text to Video", "Image to Video", "Templates"].map((t, i) => (
            <div key={t} className={`tab${i === 0 ? " active" : ""}`}>{t}</div>
          ))}
        </div>
        <button className="btn btn-primary"><Icon d={icons.plus} size={14} /> New project</button>
      </div>

      <EmptyState
        icon="video"
        title="No video projects yet"
        desc="Create your first video from text prompts, images, or pre-built templates."
        action="Create video"
      />
    </div>
  );
}
function AutoClipperPage() {
  const [url, setUrl] = useState("");
  const [submitState, setSubmitState] = useState("idle"); // idle | loading | polling | completed | failed
  const [projectId, setProjectId] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [clips, setClips] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const channelRef = useRef(null);

  const STEPS = [
    { key: "downloading",        label: "Downloading video" },
    { key: "finding_candidates", label: "Finding candidates" },
    { key: "transcribing",       label: "Transcribing audio" },
    { key: "ranking",            label: "Ranking clips with AI" },
    { key: "exporting",          label: "Exporting clips" },
    { key: "uploading",          label: "Uploading to storage" },
  ];

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  const fetchClips = useCallback(async (pid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("clip_results")
      .select("id, clip_index, title, duration, file_url, thumbnail_url, start_time, end_time")
      .eq("project_id", pid)
      .order("clip_index", { ascending: true });
    if (data) setClips(data);
  }, []);

  const startRealtime = useCallback((pid) => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-${pid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${pid}` },
        (payload) => {
          const { status, current_step, error_message } = payload.new;
          if (current_step) setCurrentStep(current_step);
          if (status === "done") {
            setSubmitState("completed");
            setCurrentStep(null);
            fetchClips(pid);
            unsubscribe();
          } else if (status === "failed") {
            setSubmitState("failed");
            setErrorMsg(error_message || "Pipeline gagal. Coba lagi.");
            unsubscribe();
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
  }, [fetchClips, unsubscribe]);

  useEffect(() => { return () => unsubscribe(); }, [unsubscribe]);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setSubmitState("loading");
    setErrorMsg(null);
    setClips([]);
    setCurrentStep(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitState("failed");
        setErrorMsg(data.error || "Gagal submit. Coba lagi.");
        return;
      }
      setProjectId(data.project_id);
      setSubmitState("polling");
      startRealtime(data.project_id);
    } catch {
      setSubmitState("failed");
      setErrorMsg("Network error. Coba lagi.");
    }
  };

  const handleReset = () => {
    unsubscribe();
    setUrl("");
    setSubmitState("idle");
    setProjectId(null);
    setCurrentStep(null);
    setClips([]);
    setErrorMsg(null);
  };

  const isBusy = submitState === "loading" || submitState === "polling";

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--white)", marginBottom: 6 }}>Auto Clipper</div>
        <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Paste a YouTube URL and let AI clip the highlights automatically.</div>
      </div>

      {/* Input card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <SectionHeader title="YouTube URL" />
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="form-input"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={isBusy}
            onKeyDown={e => e.key === "Enter" && !isBusy && handleSubmit()}
            style={{ flex: 1 }}
          />
          {(submitState === "idle" || submitState === "failed") && (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!url.trim()} style={{ opacity: !url.trim() ? 0.5 : 1 }}>
              <Icon d={icons.zap} size={14} /> Start clipping
            </button>
          )}
          {submitState === "completed" && (
            <button className="btn btn-ghost" onClick={handleReset}>
              <Icon d={icons.plus} size={14} /> New clip
            </button>
          )}
          {(submitState === "loading" || submitState === "polling") && (
            <button className="btn btn-ghost" onClick={handleReset} disabled={submitState === "loading"}>
              Cancel
            </button>
          )}
        </div>
        {submitState === "failed" && errorMsg && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(240,96,112,.1)", border: "1px solid rgba(240,96,112,.2)", color: "var(--danger)", fontSize: 13 }}>
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* Progress card */}
      {submitState === "polling" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <SectionHeader title="Processing…" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STEPS.map((step) => {
              const idx     = STEPS.findIndex(s => s.key === currentStep);
              const thisIdx = STEPS.findIndex(s => s.key === step.key);
              const isDone  = idx > thisIdx;
              const isActive = currentStep === step.key;
              return (
                <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "rgba(79,209,160,.15)" : isActive ? "rgba(124,110,248,.2)" : "var(--surface)",
                    border: `1px solid ${isDone ? "var(--accent2)" : isActive ? "var(--accent)" : "var(--border)"}`,
                  }}>
                    {isDone
                      ? <Icon d={icons.check} size={11} stroke="var(--accent2)" />
                      : <div style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "var(--accent)" : "var(--border)" }} />
                    }
                  </div>
                  <span style={{ fontSize: 13, color: isDone ? "var(--accent2)" : isActive ? "var(--text)" : "var(--text-dim)", fontWeight: isActive ? 500 : 400 }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="progress-bar" style={{ marginTop: 20 }}>
            <div className="progress-fill" style={{
              width: currentStep ? `${Math.round(((STEPS.findIndex(s => s.key === currentStep) + 1) / STEPS.length) * 100)}%` : "5%",
              transition: "width 0.6s ease",
            }} />
          </div>
          {projectId && (
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)" }}>
              Project ID: <code style={{ color: "var(--text-mid)" }}>{projectId}</code>
            </div>
          )}
        </div>
      )}

      {/* Clips result */}
      <div className="card">
        <SectionHeader title="Generated clips" />
        {submitState === "completed" && clips.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {clips.map((clip) => (
              <div key={clip.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                <div style={{ width: 80, height: 48, borderRadius: "var(--r-sm)", flexShrink: 0, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {clip.thumbnail_url
                    ? <img src={clip.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Icon d={icons.clip} size={20} stroke="var(--text-dim)" />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{clip.title || `Clip ${clip.clip_index}`}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {clip.duration ? `${Math.round(clip.duration)}s` : "—"}
                    {clip.start_time != null && clip.end_time != null
                      ? ` · ${Math.floor(clip.start_time / 60)}:${String(Math.round(clip.start_time % 60)).padStart(2, "0")} → ${Math.floor(clip.end_time / 60)}:${String(Math.round(clip.end_time % 60)).padStart(2, "0")}`
                      : ""}
                  </div>
                </div>
                {clip.file_url && (
                  <a href={clip.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px", textDecoration: "none" }}>
                    <Icon d={icons.externalLink} size={13} /> Open
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : submitState === "completed" ? (
          <EmptyState icon="clip" title="Selesai tapi tidak ada clips" desc="Pipeline selesai tapi tidak ada clips yang digenerate." />
        ) : (
          <EmptyState icon="clip" title="No clips yet" desc="Paste a YouTube URL above and hit Start clipping." />
        )}
      </div>
    </div>
  );
}

function AIWriterPage() {
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

function AssetLibraryPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [uploads, setUploads] = useState([]); // { id, name, progress, status, error, file, assetId, path, signedUrl, contentType, assetType }
  const fileInputRef = useRef(null);

  const fetchAssets = async () => {
    try {
      const res = await fetch("/api/assets");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal fetch assets");
      setAssets(json.assets || []);
    } catch (err) {
      console.error("[asset-library] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (secs) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const typeIcon = (type) => {
    if (type === "image")    return icons.image;
    if (type === "video")    return icons.video;
    if (type === "audio")    return icons.zap;
    if (type === "document") return icons.writer;
    return icons.library;
  };

  const typeColor = (type) => {
    if (type === "image")    return "var(--accent)";
    if (type === "video")    return "#4E9BF4";
    if (type === "audio")    return "var(--accent2)";
    if (type === "document") return "var(--accent3)";
    return "var(--text-dim)";
  };

  const typeBg = (type) => {
    if (type === "image")    return "rgba(124,110,248,.15)";
    if (type === "video")    return "rgba(78,155,244,.15)";
    if (type === "audio")    return "rgba(79,209,160,.15)";
    if (type === "document") return "rgba(244,149,92,.15)";
    return "rgba(107,112,128,.15)";
  };

  const isImage = (asset) => asset.type === "image" && asset.file_url;
  const isVideo = (asset) => asset.type === "video" && asset.file_url;

  const FILTERS = ["all", "image", "video", "audio", "document"];

  // --- Upload helpers ---

  const guessAssetType = (mime) => {
    if (!mime) return "other";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf" || mime.startsWith("text/") || mime.includes("document") || mime.includes("msword") || mime.includes("officedocument")) return "document";
    return "other";
  };

  // Map uploadId -> XMLHttpRequest aktif (untuk cancel)
  const activeXhrRef = useRef({});

  const updateUpload = (uploadId, patch) => {
    setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, ...patch } : u)));
  };

  const removeUpload = (uploadId) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const startUpload = async (file, uploadId) => {
    const assetType = guessAssetType(file.type);

    try {
      // 1. Request signed upload URL + insert pending row
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          assetType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memulai upload");

      const { assetId, signedUrl, path } = json;
      updateUpload(uploadId, { assetId, path, signedUrl, contentType: file.type, assetType, status: "uploading" });

      // 2. PUT file ke signedUrl via XHR untuk progress
      await new Promise((resolve, reject) => {
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
      });

      // 3. Confirm — set upload_status = ready
      const confirmRes = await fetch(`/api/assets/${assetId}/confirm`, { method: "PATCH" });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmJson.error || "Gagal konfirmasi upload");

      updateUpload(uploadId, { status: "done", progress: 100 });
      await fetchAssets();

      // Auto-remove dari list upload setelah sebentar
      setTimeout(() => removeUpload(uploadId), 2000);

    } catch (err) {
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

  const retryUpload = (uploadId) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) return;
    updateUpload(uploadId, { status: "uploading", progress: 0, error: null, assetId: null });
    startUpload(upload.file, uploadId);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newUploads = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      file,
      progress: 0,
      status: "uploading",
      error: null,
      assetId: null,
    }));

    setUploads((prev) => [...prev, ...newUploads]);
    newUploads.forEach((u) => startUpload(u.file, u.id));

    // reset input agar bisa pilih file yang sama lagi kalau perlu
    e.target.value = "";
  };

  // --- Client-side filter (filterType + search) ---
  const filteredAssets = assets.filter((asset) => {
    if (filterType !== "all" && asset.type !== filterType) return false;
    if (search.trim() && !asset.name?.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        {/* Filter tabs */}
        <div className="tabs" style={{ marginBottom: 0 }}>
          {FILTERS.map((f) => (
            <div
              key={f}
              className={`tab${filterType === f ? " active" : ""}`}
              onClick={() => setFilterType(f)}
              style={{ textTransform: "capitalize" }}
            >
              {f === "all" ? "All" : f}
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "7px 12px", flex: 1, minWidth: 160 }}>
          <Icon d={icons.search} size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets…"
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13, width: "100%", fontFamily: "inherit" }}
          />
        </div>

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
          <Icon d={icons.plus} size={14} /> Upload
        </button>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4 }}>
          {["grid", "list"].map((v) => (
            <button
              key={v}
              className="btn-icon"
              onClick={() => setViewMode(v)}
              style={{ background: viewMode === v ? "var(--accent)" : "var(--card)", color: viewMode === v ? "#fff" : "var(--text-mid)", border: "1px solid var(--border)" }}
            >
              <Icon d={v === "grid" ? icons.layers : icons.menu} size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {uploads.map((u) => (
            <div key={u.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, marginRight: 12 }}>
                  {u.name}
                </div>
                {u.status === "error" ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--danger)" }}>{u.error}</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => retryUpload(u.id)}>Retry</button>
                  </div>
                ) : u.status === "done" ? (
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
              )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${u.progress}%`,
                    background: u.status === "error" ? "var(--danger)" : u.status === "done" ? "var(--accent2)" : "var(--accent)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        viewMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--r-lg)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, borderRadius: "var(--r-md)" }} />
            ))}
          </div>
        )
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          icon="library"
          title={search ? "No assets found" : filterType !== "all" ? `No ${filterType}s yet` : "Your asset library is empty"}
          desc={search ? `No results for "${search}". Try a different keyword.` : "Assets will appear here once you upload files or generate content with AI."}
        />
      ) : viewMode === "grid" ? (
        /* Grid view */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden", cursor: "pointer", transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* Thumbnail */}
              <div style={{ height: 110, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {isImage(asset) ? (
                  <img src={asset.file_url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : isVideo(asset) ? (
                  <video src={asset.file_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: typeBg(asset.type), color: typeColor(asset.type), display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d={typeIcon(asset.type)} size={20} />
                  </div>
                )}
                {/* Duration badge for video/audio */}
                {formatDuration(asset.duration_seconds) && (
                  <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,.7)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>
                    {formatDuration(asset.duration_seconds)}
                  </div>
                )}
                {/* Type badge */}
                <div style={{ position: "absolute", top: 6, left: 6, background: typeBg(asset.type), color: typeColor(asset.type), fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {asset.type}
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>{formatSize(asset.file_size_bytes)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", cursor: "pointer", transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* Thumb / icon */}
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", flexShrink: 0, overflow: "hidden", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isImage(asset) ? (
                  <img src={asset.file_url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ color: typeColor(asset.type) }}>
                    <Icon d={typeIcon(asset.type)} size={18} />
                  </div>
                )}
              </div>
              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{asset.name}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: typeColor(asset.type), fontWeight: 500, textTransform: "capitalize" }}>{asset.type}</span>
                  {asset.source && <><span style={{ fontSize: 11, color: "var(--text-dim)" }}>·</span><span style={{ fontSize: 11, color: "var(--text-dim)" }}>{asset.source}</span></>}
                  {formatDuration(asset.duration_seconds) && <><span style={{ fontSize: 11, color: "var(--text-dim)" }}>·</span><span style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatDuration(asset.duration_seconds)}</span></>}
                </div>
              </div>
              {/* Size */}
              <div style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0 }}>{formatSize(asset.file_size_bytes)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function WorkflowPage() {
  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>Workflow Automation</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Build multi-step automations to run on schedule or trigger automatically.</div>
        </div>
        <button className="btn btn-primary"><Icon d={icons.plus} size={14} /> New workflow</button>
      </div>

      {/* Example workflow template cards */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Starter templates" action="See all" />
        <div className="three-col">
          {[
            { name: "Blog → Social",  desc: "Write blog post → auto-generate captions for 3 platforms",   color: "var(--accent)",  tag: "Content" },
            { name: "Video digest",   desc: "Upload video → clip highlights → publish to asset library",   color: "#4E9BF4",        tag: "Video" },
            { name: "Daily brief",    desc: "Fetch news → summarize → send to Slack channel each morning", color: "var(--accent2)", tag: "Productivity" },
          ].map((t) => (
            <div key={t.name} className="card" style={{ cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 13 }}>{t.name}</div>
                <span className="tag tag-purple">{t.tag}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>{t.desc}</div>
              <button className="btn btn-ghost" style={{ marginTop: 16, fontSize: 12, padding: "5px 12px" }}>Use template</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <SectionHeader title="My workflows" />
        <EmptyState icon="workflow" title="No workflows yet" desc="Build a workflow from a template or start from scratch with the visual editor." action="New workflow" />
      </div>
    </div>
  );
}

function SettingsPage() {
  const [toggles, setToggles] = useState({ ai: true, notif: false, analytics: true, beta: false });
  const toggle = (k) => setToggles(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="page">
      <div style={{ marginBottom: 24, fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--white)" }}>Settings</div>

      <div className="two-col">
        {/* Profile */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Profile</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#7C6EF8,#4E9BF4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>A</div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>Your Name</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>you@example.com</div>
              </div>
              <button className="btn btn-ghost" style={{ marginLeft: "auto", fontSize: 12 }}>Change photo</button>
            </div>
            <div className="form-group">
              <label className="form-label">Display name</label>
              <input className="form-input" placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" />
            </div>
            <button className="btn btn-primary">Save changes</button>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Danger zone</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>These actions are permanent and cannot be undone.</div>
            <button className="btn" style={{ background: "rgba(240,96,112,.12)", color: "var(--danger)", border: "1px solid rgba(240,96,112,.2)" }}>Delete account</button>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 4 }}>Preferences</div>
            {[
              { key: "ai",        name: "AI suggestions",    desc: "Show smart suggestions as you work" },
              { key: "notif",     name: "Email notifications", desc: "Get notified about exports and runs" },
              { key: "analytics", name: "Usage analytics",   desc: "Help improve the product with usage data" },
              { key: "beta",      name: "Beta features",     desc: "Access unreleased features early" },
            ].map((t) => (
              <div key={t.key} className="toggle-row">
                <div className="toggle-info">
                  <div className="toggle-name">{t.name}</div>
                  <div className="toggle-desc">{t.desc}</div>
                </div>
                <div className={`toggle${toggles[t.key] ? " on" : ""}`} onClick={() => toggle(t.key)} />
              </div>
            ))}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Plan &amp; billing</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span className="tag tag-purple">Free plan</span>
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>0 / 100,000 AI words used</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 20 }}>
              <div className="progress-fill" style={{ width: "0%" }} />
            </div>
            <button className="btn btn-primary"><Icon d={icons.sparkle} size={14} /> Upgrade to Pro</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pages = {
  dashboard: { title: "Dashboard",          component: DashboardPage },
  image:     { title: "Image Studio",        component: ImageStudioPage },
  video:     { title: "Video Studio",        component: VideoStudioPage },
  clipper:   { title: "Auto Clipper",         component: AutoClipperPage },
  writer:    { title: "AI Writer",            component: AIWriterPage },
  library:   { title: "Asset Library",        component: AssetLibraryPage },
  workflow:  { title: "Workflow Automation",  component: WorkflowPage },
  settings:  { title: "Settings",            component: SettingsPage },
};

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) return;

        const authUser = authData.user;
        let profile = null;

        try {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", authUser.id)
            .maybeSingle();
          profile = profileData || null;
        } catch (_) {
          profile = null; // tabel profiles tidak ada / query gagal -> fallback ke auth
        }

        const email = authUser.email || "";
        const fallbackName = email.includes("@") ? email.split("@")[0] : "User";

        const displayName =
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          fallbackName;

        const avatarUrl =
          profile?.avatar_url ||
          authUser.user_metadata?.avatar_url ||
          null;

        if (active) {
          setCurrentUser({ displayName, avatarUrl, email });
        }
      } catch (_) {
        // diam-diam gagal -> sidebar tetap pakai fallback default
      }
    })();

    return () => { active = false; };
  }, []);

  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const { title, component: Page } = pages[active];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Sidebar */}
        <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="logo-mark">
              <Icon d={icons.layers} size={16} stroke="#fff" />
            </div>
            {!collapsed && <span className="logo-text">Studioflow</span>}
          </div>

          {/* Nav */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-label">Workspace</div>}
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`nav-item${active === item.id ? " active" : ""}`}
                onClick={() => setActive(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <Icon d={icons[item.icon]} size={17} />
                {!collapsed && <span className="nav-label">{item.label}</span>}
                {!collapsed && item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="user-row">
              {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName || "User"}
                className="avatar"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="avatar">
                {(currentUser?.displayName || "U").charAt(0).toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <div>
                <div className="user-name">{currentUser?.displayName || "Guest"}</div>
                <div className="user-role">{currentUser?.email || "Free plan"}</div>
              </div>
            )}
          </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          {/* Header */}
          <header className="header">
            <button className="btn-icon" onClick={() => setCollapsed(c => !c)}>
              <Icon d={icons.menu} size={16} />
            </button>
            <span className="header-title">{title}</span>

            <div className="search-bar">
              <Icon d={icons.search} size={14} />
              <span>Search…</span>
            </div>

            <div style={{ position: "relative" }}>
              <button className="btn-icon">
                <Icon d={icons.bell} size={16} />
              </button>
              <div className="notif-dot" />
            </div>

            <button className="btn btn-primary" style={{ marginLeft: 4 }}>
              <Icon d={icons.plus} size={14} /> Create
            </button>
          </header>

          {/* Page content */}
          <main className="content">
            <Page key={active} />
          </main>
        </div>
      </div>
    </>
  );
}
