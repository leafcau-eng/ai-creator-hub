#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Patch Item 6 — layout.js Metadata + Font (Inter + Syne)
# Jalankan dari: ~/ai-creator-hub-new/web
# Usage: bash patch-item6-layout-metadata.sh
# ============================================================

set -e

FILE="app/layout.js"

if [ ! -f "$FILE" ]; then
  echo "❌ File $FILE tidak ditemukan. Jalankan dari folder web/"
  exit 1
fi

cp "$FILE" "$FILE.bak.item6"
echo "✅ Backup dibuat: $FILE.bak.item6"

cat > "$FILE" << 'EOF'
import { Inter, Syne } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  weight: ["700", "800"],
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Creator Hub by SCH",
  description:
    "All-in-one AI workspace for content creation, image generation, video production, clipping, and automation.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
EOF

echo "✅ STEP 1 selesai: layout.js diganti (metadata + font Inter/Syne)"

# ------------------------------------------------------------
# STEP 2: Cek apakah globals.css sudah pakai var font baru
# ------------------------------------------------------------
GLOBALS="app/globals.css"

if [ -f "$GLOBALS" ]; then
  if grep -q -- "--font-geist-sans\|--font-geist-mono" "$GLOBALS"; then
    echo ""
    echo "⚠️  PERHATIAN: $GLOBALS masih referensi --font-geist-sans / --font-geist-mono"
    echo "    Variable font sekarang adalah: --font-inter dan --font-syne"
    echo "    Update manual di globals.css, contoh:"
    echo "    body { font-family: var(--font-inter), sans-serif; }"
    echo "    h1, h2, h3 { font-family: var(--font-syne), sans-serif; }"
  else
    echo "ℹ️  $GLOBALS tidak referensi --font-geist-* — cek manual apakah perlu tambah --font-inter / --font-syne"
  fi
else
  echo "⚠️  $GLOBALS tidak ditemukan, skip cek font reference"
fi

echo ""
echo "============================================================"
echo "✅ Patch Item 6 selesai."
echo "Next steps:"
echo "  1. Cek pesan di atas soal globals.css (kalau ada)"
echo "  2. npm run build"
echo "  3. Lolos -> git add app/layout.js && git commit -m 'feat: update metadata + font Inter/Syne (Item 6)'"
echo "  4. Error -> cp app/layout.js.bak.item6 app/layout.js"
echo "============================================================"
