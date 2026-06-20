#!/usr/bin/env python3
"""
Build an installable OpenWrt **apk** (apk-tools 3 / APKv3) package for
luci-theme-obsidian — without the OpenWrt SDK, using only the Python stdlib.

OpenWrt's new package manager (apk, replacing opkg from SNAPSHOT / 25.x onward)
consumes the APKv3 "ADB" binary format — NOT the legacy ar/gzip-tar `.ipk`.
An APKv3 file is a single compressed stream:

    "ADBd" + raw-DEFLATE( adb_file_header + ADB_BLOCK_ADB + ADB_BLOCK_DATA* )

  * adb_file_header  = uint32 magic 0x2e424441 ("ADB.") + uint32 schema "pckg"
  * ADB_BLOCK_ADB    = the control/metadata value-tree (pkginfo + paths + scripts)
  * ADB_BLOCK_DATA*  = one block per regular file: {path_idx,file_idx}+raw bytes

The metadata is a binary "ADB" value tree (tagged 32-bit values pointing into a
data pool), not text — so this file implements a small ADB serializer. Layout,
field ids and hashing follow apk-tools master (src/adb.c, src/apk_adb.h,
src/app_mkpkg.c, src/extract_v3.c). The package is unsigned (zero SIG blocks),
which is valid and matches current OpenWrt practice; install with:

    apk add --allow-untrusted ./luci-theme-obsidian-<version>.apk

Usage:  python packaging/build-apk.py
Output: dist/luci-theme-obsidian-<version>.apk
"""

import io
import os
import sys
import zlib
import struct
import hashlib

# --------------------------------------------------------------------------- #
PKG_NAME = "luci-theme-obsidian"
VERSION = "1.0.7-r1"          # apk uses -rN revisions (ipk's "1.0.7-1" -> "1.0.7-r1")
ARCH = "noarch"              # OpenWrt maps PKGARCH=all -> apk arch "noarch" (universal)
MAINTAINER = "Obsidian Theme contributors"
DESCRIPTION = "Obsidian - a clean modern LuCI theme (light/dark mode, custom wallpaper, adjustable blur, accent colours)."
LICENSE = "Apache-2.0"
ORIGIN = "feeds/luci/themes/" + PKG_NAME
URL = "https://github.com/OnyxAxisOwO/Obsidian-Theme"
DEPENDS = ["luci-base"]
# Fixed timestamp for reproducible packages (2025-01-01 UTC), matching build-ipk.py.
EPOCH = 1735689600

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (source path relative to repo, destination path on device, mode) — same set as the .ipk.
FILES = [
    ("htdocs/luci-static/obsidian/cascade.css",      "www/luci-static/obsidian/cascade.css",      0o644),
    ("htdocs/luci-static/obsidian/mobile.css",       "www/luci-static/obsidian/mobile.css",       0o644),
    ("htdocs/luci-static/obsidian/obsidian.css",     "www/luci-static/obsidian/obsidian.css",     0o644),
    ("htdocs/luci-static/obsidian/obsidian.js",      "www/luci-static/obsidian/obsidian.js",      0o644),
    ("htdocs/luci-static/obsidian/logo.svg",         "www/luci-static/obsidian/logo.svg",         0o644),
    ("htdocs/luci-static/resources/menu-obsidian.js","www/luci-static/resources/menu-obsidian.js",0o644),
    ("ucode/template/themes/obsidian/header.ut",     "usr/share/ucode/luci/template/themes/obsidian/header.ut", 0o644),
    ("ucode/template/themes/obsidian/footer.ut",     "usr/share/ucode/luci/template/themes/obsidian/footer.ut", 0o644),
    ("root/etc/uci-defaults/30_luci-theme-obsidian", "etc/uci-defaults/30_luci-theme-obsidian",   0o755),
]

# Maintainer scripts (bodies stored inline in the ADB scripts object). Activation
# is also handled at first boot by procd running /etc/uci-defaults, so post-install
# only runs it early; it is idempotent (the uci-defaults script self-checks).
POSTINST = """#!/bin/sh
[ -x /etc/uci-defaults/30_luci-theme-obsidian ] && /etc/uci-defaults/30_luci-theme-obsidian
exit 0
"""
POSTDEINST = """#!/bin/sh
uci -q delete luci.themes.Obsidian
if uci -q get luci.main.mediaurlbase | grep -q /luci-static/obsidian; then
\tuci set luci.main.mediaurlbase=/luci-static/bootstrap
fi
uci commit luci
exit 0
"""

# --- ADB constants (apk-tools src/adb.h, src/apk_adb.h) --------------------- #
ADB_FORMAT_MAGIC = 0x2e424441       # "ADB." little-endian
ADB_SCHEMA_PACKAGE = 0x676b6370     # "pckg" little-endian

# adb_val_t: high nibble = type, low 28 bits = inline int or byte offset into pool
T_SPECIAL = 0x00000000              # NULL == 0
T_INT     = 0x10000000
T_INT32   = 0x20000000
T_INT64   = 0x30000000
T_BLOB8   = 0x80000000
T_BLOB16  = 0x90000000
T_BLOB32  = 0xA0000000
T_ARRAY   = 0xD0000000
T_OBJECT  = 0xE0000000
VAL_MASK  = 0x0FFFFFFF
ADB_NULL  = 0x00000000

# block types (top 2 bits of type_size); size field = 4 + payload_len, 8-byte aligned
BLK_ADB, BLK_SIG, BLK_DATA = 0, 1, 2

# field ids
PKG_PKGINFO, PKG_PATHS, PKG_SCRIPTS = 0x01, 0x02, 0x03
PI_NAME, PI_VERSION, PI_HASHES, PI_DESCRIPTION, PI_ARCH, PI_LICENSE = 0x01, 0x02, 0x03, 0x04, 0x05, 0x06
PI_ORIGIN, PI_MAINTAINER, PI_URL, PI_BUILD_TIME, PI_INSTALLED_SIZE, PI_DEPENDS = 0x07, 0x08, 0x09, 0x0b, 0x0c, 0x0f
DI_NAME, DI_ACL, DI_FILES = 0x01, 0x02, 0x03
FI_NAME, FI_ACL, FI_SIZE, FI_MTIME, FI_HASHES = 0x01, 0x02, 0x03, 0x04, 0x05
ACL_MODE, ACL_USER, ACL_GROUP = 0x01, 0x02, 0x03
SCRPT_POSTINST, SCRPT_POSTDEINST, SCRPT_POSTUPGRADE = 0x03, 0x05, 0x07
DEP_NAME = 0x01


class Adb:
    """Minimal ADB value-tree serializer (build leaf -> root)."""

    def __init__(self):
        # Pool begins with struct adb_hdr {u8 compat_ver=0; u8 ver=0; u16 reserved=0; u32 root}
        # = 8 bytes. The root adb_val_t lives at bytes 4..7 and is patched in finalize().
        self.pool = bytearray(8)
        self.hash_off = None        # absolute offset of the 20 placeholder bytes (PI_HASHES)

    def _raw(self, data, align=4):
        """Append data at the next `align`-aligned offset; return that offset."""
        while len(self.pool) % align != 0:
            self.pool.append(0)
        off = len(self.pool)
        self.pool += data
        return off

    def integer(self, v):
        if v < 0:
            raise ValueError("negative int")
        if v < 0x10000000:                       # fits inline in 28 bits
            return T_INT | v
        if v < 0x100000000:
            return T_INT32 | self._raw(struct.pack("<I", v), 4)
        return T_INT64 | self._raw(struct.pack("<Q", v), 8)

    def blob(self, b):
        if isinstance(b, str):
            b = b.encode("utf-8")
        n = len(b)
        if n == 0:
            return ADB_NULL
        # length-prefix size selects the type and the alignment (apk aligns a blob
        # to its prefix width: BLOB8->1, BLOB16->2, BLOB32->4).
        if n <= 0xFF:
            return T_BLOB8 | self._raw(struct.pack("<B", n) + b, 1)
        if n <= 0xFFFF:
            return T_BLOB16 | self._raw(struct.pack("<H", n) + b, 2)
        return T_BLOB32 | self._raw(struct.pack("<I", n) + b, 4)

    def _slots(self, slots, kind):
        # slot[0] = number of uint32 slots present (count, raw LE); fields/elements
        # at slots 1..n-1. Trailing NULL slots are trimmed to match apk byte-for-byte.
        n = len(slots)
        while n > 1 and slots[n - 1] == ADB_NULL:
            n -= 1
        if n <= 1:
            return ADB_NULL          # empty container -> ADB_NULL (apk's `if (n > 1)` guard)
        buf = struct.pack("<I", n) + b"".join(struct.pack("<I", slots[i]) for i in range(1, n))
        return kind | self._raw(buf, 4)

    def obj(self, fields):
        """fields: dict {field_id: adb_val}. field_id i -> slot i (slot 0 = count)."""
        hi = max(fields) if fields else 0
        slots = [ADB_NULL] * (hi + 1)
        for fid, val in fields.items():
            slots[fid] = val
        return self._slots(slots, T_OBJECT)

    def array(self, elements):
        """elements: list of adb_val, placed at slots 1..n."""
        return self._slots([ADB_NULL] + list(elements), T_ARRAY)

    def reserve_hash(self):
        """Write a 20-byte zero placeholder for PI_HASHES (a SHA1-length unique-id
        that apk ignores for integrity), remembering where to patch it."""
        v = self.blob(b"\x00" * 20)            # BLOB8: 1-byte length prefix + 20 data bytes
        self.hash_off = (v & VAL_MASK) + 1     # skip the length-prefix byte
        return v

    def finalize(self, root_val):
        self.pool[4:8] = struct.pack("<I", root_val)
        if self.hash_off is not None:
            digest = hashlib.sha256(bytes(self.pool)).digest()[:20]
            self.pool[self.hash_off:self.hash_off + 20] = digest
        return bytes(self.pool)


def blob_sort_key(s):
    # apk_blob_sort: memcmp over the shorter length, then shorter string first —
    # exactly Python's bytes ordering.
    return s.encode("utf-8")


def build_control(file_entries):
    """file_entries: list of (dest, mode, data). Returns (adb_blob_bytes, data_plan)
    where data_plan is a list of (path_idx, file_idx, data) in extract order."""
    adb = Adb()

    def acl(mode):
        return adb.obj({ACL_MODE: adb.integer(mode & 0o7777),
                        ACL_USER: adb.blob("root"),
                        ACL_GROUP: adb.blob("root")})

    # Group files by their directory; include every ancestor directory (apk lists
    # the full tree). dirs map: dirpath -> list of (basename, mode, data).
    dirs = {}
    for dest, mode, data in file_entries:
        d, base = os.path.split(dest)
        dirs.setdefault(d, [])
        # ensure every ancestor directory exists as a (possibly empty) path entry
        parts = d.split("/")
        for i in range(1, len(parts) + 1):
            dirs.setdefault("/".join(parts[:i]), [])
        dirs[d].append((base, mode, data))

    sorted_dirs = sorted(dirs.keys(), key=blob_sort_key)
    data_plan = []
    dir_vals = []
    for di, dpath in enumerate(sorted_dirs, start=1):
        files = sorted(dirs[dpath], key=lambda f: blob_sort_key(f[0]))
        file_vals = []
        for fi, (base, mode, data) in enumerate(files, start=1):
            digest = hashlib.sha256(data).digest()
            fobj = adb.obj({
                FI_NAME: adb.blob(base),
                FI_ACL: acl(mode),
                FI_SIZE: adb.integer(len(data)),
                FI_MTIME: adb.integer(EPOCH),
                FI_HASHES: adb.blob(digest),     # raw 32-byte SHA-256, content-verified on extract
            })
            file_vals.append(fobj)
            if len(data) > 0:
                data_plan.append((di, fi, data))
        dir_vals.append(adb.obj({
            DI_NAME: adb.blob(dpath),
            DI_ACL: acl(0o755),
            DI_FILES: adb.array(file_vals),
        }))
    paths_val = adb.array(dir_vals)

    installed_size = max(1, sum(len(data) for _, _, data in file_entries))
    dep_vals = [adb.obj({DEP_NAME: adb.blob(name)}) for name in DEPENDS]
    pkginfo = adb.obj({
        PI_NAME: adb.blob(PKG_NAME),
        PI_VERSION: adb.blob(VERSION),
        PI_HASHES: adb.reserve_hash(),
        PI_DESCRIPTION: adb.blob(DESCRIPTION),
        PI_ARCH: adb.blob(ARCH),
        PI_LICENSE: adb.blob(LICENSE),
        PI_ORIGIN: adb.blob(ORIGIN),
        PI_MAINTAINER: adb.blob(MAINTAINER),
        PI_URL: adb.blob(URL),
        PI_BUILD_TIME: adb.integer(EPOCH),
        PI_INSTALLED_SIZE: adb.integer(installed_size),
        PI_DEPENDS: adb.array(dep_vals),
    })

    scripts = adb.obj({
        SCRPT_POSTINST: adb.blob(POSTINST),
        SCRPT_POSTUPGRADE: adb.blob(POSTINST),
        SCRPT_POSTDEINST: adb.blob(POSTDEINST),
    })

    root = adb.obj({PKG_PKGINFO: pkginfo, PKG_PATHS: paths_val, PKG_SCRIPTS: scripts})
    return adb.finalize(root), data_plan, installed_size


def frame_block(btype, payload):
    # Short block header: low 30 bits = 4 + payload length, top 2 bits = type,
    # then zero-padded to 8-byte alignment. (apk's EXT form for >1 GiB blocks is
    # unnecessary here — every payload is a few KB.)
    assert 4 + len(payload) <= 0x3FFFFFFF, "block too large; would need ADB_BLOCK_EXT"
    type_size = (btype << 30) | (4 + len(payload))
    out = struct.pack("<I", type_size) + payload
    while len(out) % 8 != 0:
        out += b"\x00"
    return out


def main():
    file_entries = []
    for src, dest, mode in FILES:
        full = os.path.join(REPO, src.replace("/", os.sep))
        if not os.path.isfile(full):
            sys.exit("ERROR: missing source file: %s" % src)
        with open(full, "rb") as fh:
            # normalize CRLF->LF: sh needs LF, and it makes builds reproducible across platforms
            file_entries.append((dest, mode, fh.read().replace(b"\r\n", b"\n")))

    adb_blob, data_plan, installed_size = build_control(file_entries)

    image = struct.pack("<II", ADB_FORMAT_MAGIC, ADB_SCHEMA_PACKAGE)
    image += frame_block(BLK_ADB, adb_blob)
    for path_idx, file_idx, data in data_plan:
        image += frame_block(BLK_DATA, struct.pack("<II", path_idx, file_idx) + data)

    co = zlib.compressobj(9, zlib.DEFLATED, -15)     # raw DEFLATE, no zlib/gzip wrapper
    payload = co.compress(image) + co.flush()
    pkg = b"ADBd" + payload

    out_dir = os.path.join(REPO, "dist")
    os.makedirs(out_dir, exist_ok=True)
    apk_path = os.path.join(out_dir, "%s-%s.apk" % (PKG_NAME, VERSION))
    with open(apk_path, "wb") as fh:
        fh.write(pkg)

    print("Built: %s" % os.path.relpath(apk_path, REPO))
    print("  package        : %s" % PKG_NAME)
    print("  version        : %s" % VERSION)
    print("  architecture   : %s" % ARCH)
    print("  installed-size : %d bytes (%d files)" % (installed_size, len(FILES)))
    print("  data blocks    : %d" % len(data_plan))
    print("  apk size       : %d bytes" % len(pkg))


if __name__ == "__main__":
    main()
