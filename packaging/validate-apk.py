#!/usr/bin/env python3
"""
Validate an OpenWrt apk (APKv3 / ADB) package produced by build-apk.py.

This is an INDEPENDENT re-implementation of the reader: it decompresses the
"ADBd" raw-DEFLATE stream, parses the adb_file_header and ADB blocks, walks the
control value-tree (pkginfo + paths + files) and then verifies that every
ADB_BLOCK_DATA block matches the metadata it claims (path_idx / file_idx / size)
and that each file's bytes hash to the SHA-256 stored in its file object — i.e.
exactly the checks apk performs on `apk extract`. Exits non-zero on any problem.

Usage:
    python packaging/validate-apk.py [path/to/package.apk]
If no path is given, the newest *.apk under dist/ is validated.
"""

import glob
import os
import sys
import zlib
import struct
import hashlib

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ADB_FORMAT_MAGIC = 0x2e424441
ADB_SCHEMA_PACKAGE = 0x676b6370
T_MASK, VAL_MASK = 0xF0000000, 0x0FFFFFFF
T_INT, T_INT32, T_INT64 = 0x10000000, 0x20000000, 0x30000000
T_BLOB8, T_BLOB16, T_BLOB32 = 0x80000000, 0x90000000, 0xA0000000
T_ARRAY, T_OBJECT = 0xD0000000, 0xE0000000
BLK_ADB, BLK_SIG, BLK_DATA = 0, 1, 2

PKG_PKGINFO, PKG_PATHS = 0x01, 0x02
PI_NAME, PI_VERSION, PI_ARCH = 0x01, 0x02, 0x05
DI_NAME, DI_FILES = 0x01, 0x03
FI_NAME, FI_SIZE, FI_HASHES = 0x01, 0x03, 0x05


def fail(msg):
    print("FAIL: %s" % msg)
    sys.exit(1)


def find_apk():
    if len(sys.argv) > 1:
        return sys.argv[1]
    matches = sorted(glob.glob(os.path.join(REPO, "dist", "*.apk")), key=os.path.getmtime)
    if not matches:
        fail("no .apk found in dist/ (run packaging/build-apk.py first)")
    return matches[-1]


class AdbReader:
    def __init__(self, blob):
        self.b = blob
        if len(blob) < 8:
            fail("ADB control blob too short")
        if blob[0] != 0:
            fail("adb_compat_ver must be 0, got %d (apk would reject)" % blob[0])
        self.root = struct.unpack_from("<I", blob, 4)[0]

    def u32(self, off):
        return struct.unpack_from("<I", self.b, off)[0]

    def integer(self, val):
        t = val & T_MASK
        if t == T_INT:
            return val & VAL_MASK
        if t == T_INT32:
            return self.u32(val & VAL_MASK)
        if t == T_INT64:
            return struct.unpack_from("<Q", self.b, val & VAL_MASK)[0]
        fail("expected int value, got type 0x%x" % t)

    def blob(self, val):
        if val == 0:
            return b""
        t, off = val & T_MASK, val & VAL_MASK
        if t == T_BLOB8:
            n = self.b[off]; start = off + 1
        elif t == T_BLOB16:
            n = struct.unpack_from("<H", self.b, off)[0]; start = off + 2
        elif t == T_BLOB32:
            n = struct.unpack_from("<I", self.b, off)[0]; start = off + 4
        else:
            fail("expected blob value, got type 0x%x" % t)
        return self.b[start:start + n]

    def _slots(self, val):
        off = val & VAL_MASK
        count = self.u32(off)
        return [self.u32(off + 4 * i) for i in range(count)]   # slot 0 == count

    def fields(self, val):
        if (val & T_MASK) != T_OBJECT:
            fail("expected object, got type 0x%x" % (val & T_MASK))
        slots = self._slots(val)
        return {i: slots[i] for i in range(1, len(slots)) if slots[i] != 0}

    def items(self, val):
        if (val & T_MASK) != T_ARRAY:
            fail("expected array, got type 0x%x" % (val & T_MASK))
        slots = self._slots(val)
        return [slots[i] for i in range(1, len(slots))]


def main():
    apk = find_apk()
    print("Validating %s" % os.path.relpath(apk, REPO))
    with open(apk, "rb") as fh:
        raw = fh.read()

    if raw[:3] != b"ADB":
        fail("not an APKv3 file (missing 'ADB' magic; got %r)" % raw[:4])
    comp = chr(raw[3])
    if comp == "d":
        try:
            image = zlib.decompress(raw[4:], -15)      # raw DEFLATE
        except zlib.error as e:
            fail("raw-DEFLATE decompression failed: %s" % e)
    elif comp == ".":
        image = raw[4:]
    else:
        fail("unsupported compression magic 'ADB%s'" % comp)

    magic, schema = struct.unpack_from("<II", image, 0)
    if magic != ADB_FORMAT_MAGIC:
        fail("bad adb_file_header magic 0x%08x (expected 0x%08x)" % (magic, ADB_FORMAT_MAGIC))
    if schema != ADB_SCHEMA_PACKAGE:
        fail("schema 0x%08x is not ADB_SCHEMA_PACKAGE 0x%08x" % (schema, ADB_SCHEMA_PACKAGE))

    # ---- walk blocks ----
    off, adb_blob, data_blocks = 8, None, []
    while off < len(image):
        if off % 8 != 0:
            fail("block at %d is not 8-byte aligned" % off)
        type_size = struct.unpack_from("<I", image, off)[0]
        btype, size = type_size >> 30, type_size & 0x3FFFFFFF
        if size < 4 or off + size > len(image):
            fail("block at %d has bad size %d" % (off, size))
        payload = image[off + 4:off + size]
        if btype == BLK_ADB:
            if adb_blob is not None:
                fail("more than one ADB_BLOCK_ADB")
            adb_blob = payload
        elif btype == BLK_DATA:
            data_blocks.append(payload)
        elif btype == BLK_SIG:
            pass
        else:
            fail("unknown block type %d at %d" % (btype, off))
        off += (size + 7) & ~7
    if adb_blob is None:
        fail("no ADB_BLOCK_ADB (control) block found")

    r = AdbReader(adb_blob)
    root = r.fields(r.root)
    if PKG_PKGINFO not in root or PKG_PATHS not in root:
        fail("root package object missing pkginfo/paths")

    info = r.fields(root[PKG_PKGINFO])
    name = r.blob(info.get(PI_NAME, 0)).decode("utf-8", "replace")
    version = r.blob(info.get(PI_VERSION, 0)).decode("utf-8", "replace")
    arch = r.blob(info.get(PI_ARCH, 0)).decode("utf-8", "replace")
    if not name or not version:
        fail("pkginfo missing required name/version")

    # ---- expected file list in extract (depth-first) order ----
    expected = []   # (path_idx, file_idx, fullpath, size, sha256)
    dirs = r.items(root[PKG_PATHS])
    total_files = 0
    for di, dval in enumerate(dirs, start=1):
        d = r.fields(dval)
        dpath = r.blob(d.get(DI_NAME, 0)).decode("utf-8", "replace")
        files = r.items(d.get(DI_FILES, 0)) if DI_FILES in d else []
        for fi, fval in enumerate(files, start=1):
            f = r.fields(fval)
            total_files += 1
            size = r.integer(f[FI_SIZE]) if FI_SIZE in f else 0
            h = r.blob(f.get(FI_HASHES, 0))
            full = (dpath + "/" + r.blob(f.get(FI_NAME, 0)).decode("utf-8", "replace")).lstrip("/")
            if size > 0:
                if len(h) != 32:
                    fail("%s: per-file hash is %d bytes, expected 32 (SHA-256)" % (full, len(h)))
                expected.append((di, fi, full, size, h))

    if len(data_blocks) != len(expected):
        fail("DATA block count %d != regular-file count %d" % (len(data_blocks), len(expected)))

    # ---- verify each DATA block against metadata (the apk extract contract) ----
    for blk, (pi, fi, full, size, h) in zip(data_blocks, expected):
        bpi, bfi = struct.unpack_from("<II", blk, 0)
        body = blk[8:]
        if bpi != pi or bfi != fi:
            fail("%s: DATA block indices (%d,%d) != metadata (%d,%d)" % (full, bpi, bfi, pi, fi))
        if len(body) != size:
            fail("%s: DATA payload %d bytes != metadata size %d" % (full, len(body), size))
        if hashlib.sha256(body).digest() != h:
            fail("%s: content SHA-256 does not match stored ADBI_FI_HASHES" % full)

    print("  package        : %s" % name)
    print("  version        : %s" % version)
    print("  architecture   : %s" % arch)
    print("  directories    : %d" % len(dirs))
    print("  files          : %d (%d with data)" % (total_files, len(expected)))
    print("OK: APKv3 structure valid; every file's bytes match its ADBI_FI_HASHES.")


if __name__ == "__main__":
    main()
