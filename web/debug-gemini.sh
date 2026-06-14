#!/usr/bin/env python3
# debug-gemini.sh — tambah console.error debug ke Gemini error handler

import os, sys

TARGET = os.path.expanduser("~/ai-creator-hub-new/web/lib/ai-providers.ts")

if not os.path.exists(TARGET):
    print("ERROR: file tidak ditemukan:", TARGET)
    sys.exit(1)

with open(TARGET, "r") as f:
    content = f.read()

OLD = """  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }"""

NEW = """  if (!res.ok) {
    const errBody = await res.text();
    console.error("GEMINI STATUS:", res.status);
    console.error("GEMINI ERROR BODY:", errBody);
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }"""

if OLD not in content:
    print("ERROR: block target tidak ditemukan. Mungkin sudah dipatch sebelumnya.")
    sys.exit(1)

# Backup
with open(TARGET + ".bak", "w") as f:
    f.write(content)
print("Backup dibuat:", TARGET + ".bak")

content = content.replace(OLD, NEW, 1)

with open(TARGET, "w") as f:
    f.write(content)

# Verifikasi
if 'console.error("GEMINI STATUS:"' in content:
    print("SUKSES: debug logging berhasil ditambahkan.")
else:
    print("ERROR: verifikasi gagal.")
    sys.exit(1)
