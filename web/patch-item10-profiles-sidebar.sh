#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Patch Item 10 — Profiles Sidebar
# Jalankan dari: ~/ai-creator-hub-new/web
# Usage: bash patch-item10-profiles-sidebar.sh
# ============================================================

set -e

FILE="app/page.jsx"

if [ ! -f "$FILE" ]; then
  echo "❌ File $FILE tidak ditemukan. Jalankan script ini dari folder web/"
  exit 1
fi

cp "$FILE" "$FILE.bak.item10"
echo "✅ Backup dibuat: $FILE.bak.item10"

# ------------------------------------------------------------
# STEP 1: Tambah state + useEffect fetch user/profile
# Disisipkan tepat setelah "export default function App() {"
# ------------------------------------------------------------
python3 - "$FILE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

anchor = "export default function App() {"
if anchor not in src:
    print("❌ Anchor 'export default function App() {' tidak ditemukan. Patch dibatalkan.")
    sys.exit(1)

inject = anchor + """
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
"""

src = src.replace(anchor, inject, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 1 selesai: state + useEffect ditambahkan ke App()")
PYEOF

# ------------------------------------------------------------
# STEP 2: Ganti JSX sidebar-footer (avatar + nama + role)
# ------------------------------------------------------------
python3 - "$FILE" << 'PYEOF'
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

old = '''          <div className="user-row">
            <div className="avatar">A</div>
            {!collapsed && (
              <div>
                <div className="user-name">Your Name</div>
                <div className="user-role">Free plan</div>
              </div>
            )}
          </div>'''

new = '''          <div className="user-row">
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
          </div>'''

if old not in src:
    print("❌ Blok sidebar-footer asli tidak ditemukan (mungkin sudah diubah). Patch JSX dibatalkan, cek manual.")
    sys.exit(1)

src = src.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 2 selesai: JSX sidebar-footer diganti")
PYEOF

echo ""
echo "============================================================"
echo "✅ Patch Item 10 selesai."
echo "Next steps:"
echo "  1. npm run build"
echo "  2. Kalau lolos -> git add app/page.jsx && git commit -m 'feat: profiles sidebar (Item 10)'"
echo "  3. Kalau error -> restore: cp app/page.jsx.bak.item10 app/page.jsx"
echo "============================================================"
