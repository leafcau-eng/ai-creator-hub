#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Patch Item 12 v2 — Cancel Upload (JSX button only)
# Jalankan dari: ~/ai-creator-hub-new/web
# Usage: bash patch-item12-v2.sh
# ============================================================

set -e

FILE="app/page.jsx"

if [ ! -f "$FILE" ]; then
  echo "❌ File $FILE tidak ditemukan. Jalankan dari folder web/"
  exit 1
fi

cp "$FILE" "$FILE.bak.item12v2"
echo "✅ Backup dibuat: $FILE.bak.item12v2"

python3 - "$FILE" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# Toleran whitespace: cari blok ") : (  ...{u.progress}%...  )}" yang merupakan
# else-branch terakhir dari status === "error" / "done" ternary di progress list
pattern = re.compile(
    r'(\)\s*:\s*\(\s*)'
    r'<span style=\{\{ fontSize: 11, color: "var\(--text-dim\)" \}\}>\{u\.progress\}%</span>\s*'
    r'(\)\}\s*</div>)',
    re.MULTILINE
)

match = pattern.search(src)
if not match:
    print("❌ Pattern progress percentage span tidak ditemukan. Patch v2 dibatalkan.")
    sys.exit(1)

open_part = match.group(1)
close_part = match.group(2)

replacement = (
    open_part +
    '''<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{u.progress}%</span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 11, padding: "3px 10px" }}
                    onClick={() => cancelUpload(u.id)}
                  >
                    Cancel
                  </button>
                </div>
              ''' +
    close_part
)

src = src[:match.start()] + replacement + src[match.end():]

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("✅ Patch v2 selesai: tombol Cancel ditambahkan di progress list")
PYEOF

echo ""
echo "============================================================"
echo "✅ Patch Item 12 v2 selesai."
echo "Next steps:"
echo "  1. grep -n 'cancelUpload\\|Cancel' app/page.jsx   (pastikan muncul di progress list)"
echo "  2. npm run build"
echo "  3. Lolos -> git add app/page.jsx && git commit -m 'feat: cancel upload button UI (Item 12 v2)' && git push origin main"
echo "  4. Error -> cp app/page.jsx.bak.item12v2 app/page.jsx"
echo "============================================================"
