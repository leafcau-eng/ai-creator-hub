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
          supabase.from("clips").select("id", { count: "exact", head: true }),
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
      .from("clips")
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
          if (status === "completed") {
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
  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>AI Writer</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Generate blogs, captions, scripts, and more with AI.</div>
        </div>
        <button className="btn btn-primary"><Icon d={icons.plus} size={14} /> New document</button>
      </div>

      <div className="three-col" style={{ marginBottom: 24 }}>
        {[
          { icon: "writer",  color: "#7C6EF8", bg: "rgba(124,110,248,.15)", title: "Blog post",        desc: "Long-form SEO articles" },
          { icon: "sparkle", color: "#4FD1A0", bg: "rgba(79,209,160,.15)",  title: "Social caption",   desc: "Instagram, Twitter, TikTok" },
          { icon: "video",   color: "#4E9BF4", bg: "rgba(78,155,244,.15)",  title: "Video script",     desc: "YouTube, Reels, Shorts" },
        ].map((t) => (
          <div key={t.title} className="card" style={{ cursor: "pointer", transition: "border-color .15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: t.bg, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Icon d={icons[t.icon]} size={18} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.desc}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <SectionHeader title="Recent documents" />
        <EmptyState icon="writer" title="No documents yet" desc="Pick a content type above or start with a blank document." action="New document" />
      </div>
    </div>
  );
}

function AssetLibraryPage() {
  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
        <div className="tabs">
          {["All", "Images", "Videos", "Audio", "Documents"].map((t, i) => (
            <div key={t} className={`tab${i === 0 ? " active" : ""}`}>{t}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost"><Icon d={icons.upload} size={14} /> Upload</button>
          <button className="btn btn-primary"><Icon d={icons.plus} size={14} /> Add asset</button>
        </div>
      </div>

      <EmptyState
        icon="library"
        title="Your asset library is empty"
        desc="Upload images, videos, audio files, and documents to keep everything in one place."
        action="Upload assets"
      />
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
              <div className="avatar">A</div>
              {!collapsed && (
                <div>
                  <div className="user-name">Your Name</div>
                  <div className="user-role">Free plan</div>
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
