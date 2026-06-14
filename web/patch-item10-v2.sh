#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Patch Item 10 v2 — Profiles Sidebar (STEP 2 only)
# Untuk dijalankan SETELAH patch v1 (STEP 1 sudah sukses)
# Jalankan dari: ~/ai-creator-hub-new/web
# Usage: bash patch-item10-v2.sh
# ============================================================

set -e

FILE="app/page.jsx"

if [ ! -f "$FILE" ]; then
  echo "❌ File $FILE tidak ditemukan. Jalankan dari folder web/"
  exit 1
fi

cp "$FILE" "$FILE.bak.item10v2"
echo "✅ Backup dibuat: $FILE.bak.item10v2"

python3 - "$FILE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# Regex toleran whitespace/indentasi, cari blok user-row dengan "Your Name" / "Free plan"
pattern = re.compile(
    r'(<div className="user-row">\s*)'
    r'<div className="avatar">A</div>\s*'
    r'\{!collapsed && \(\s*'
    r'<div>\s*'
    r'<div className="user-name">Your Name</div>\s*'
    r'<div className="user-role">Free plan</div>\s*'
    r'</div>\s*'
    r'\)\}\s*'
    r'(</div>)',
    re.MULTILINE
)

match = pattern.search(src)
if not match:
    print("❌ Pattern user-row tidak ditemukan. Patch v2 dibatalkan.")
    sys.exit(1)

open_tag = match.group(1)
close_tag = match.group(2)

replacement = (
    open_tag +
    '''{currentUser?.avatarUrl ? (
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
          ''' +
    close_tag
)

src = src[:match.start()] + replacement + src[match.end():]

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ STEP 2 (v2) selesai: JSX sidebar-footer diganti")
PYEOF

echo ""
echo "============================================================"
echo "✅ Patch v2 selesai."
echo "Next steps:"
echo "  1. npm run build"
echo "  2. Lolos -> git add app/page.jsx && git commit -m 'feat: profiles sidebar (Item 10)'"
echo "  3. Error -> cp app/page.jsx.bak.item10v2 app/page.jsx"
echo "============================================================"
