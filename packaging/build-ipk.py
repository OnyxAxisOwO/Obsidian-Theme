#!/usr/bin/env python3
"""
Build an installable OpenWrt opkg .ipk for luci-theme-obsidian — without the
OpenWrt SDK.

An .ipk is simply a gzip-compressed tar containing three members:
    ./debian-binary      (the text "2.0")
    ./control.tar.gz     (package metadata + maintainer scripts)
    ./data.tar.gz        (the files, at their on-device paths)

This is the same layout produced by opkg-utils' ipkg-build, so the result
installs with `opkg install`. The package is architecture-independent (all).

Usage:  python packaging/build-ipk.py
Output: dist/luci-theme-obsidian_<version>_all.ipk
"""

import io
import os
import sys
import gzip
import tarfile

# --------------------------------------------------------------------------- #
PKG_NAME = "luci-theme-obsidian"
VERSION = "1.0.7-1"
ARCH = "all"
MAINTAINER = "Obsidian Theme contributors"
DESCRIPTION = "Obsidian - a clean modern LuCI theme (light/dark mode, custom wallpaper, adjustable blur, accent colours)."
DEPENDS = "luci-base"
SECTION = "luci"
# Fixed timestamp for reproducible archives (2025-01-01 UTC).
EPOCH = 1735689600

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (source path relative to repo, destination path on device, mode)
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

# Standard OpenWrt postinst: runs the /etc/uci-defaults scripts on install.
POSTINST = """#!/bin/sh
[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0
[ -s ${IPKG_INSTROOT}/lib/functions.sh ] || exit 0
. ${IPKG_INSTROOT}/lib/functions.sh
default_postinst $0 $@
"""

# Remove the theme registration from uci on a real (online) removal.
POSTRM = """#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] || {
\tuci -q delete luci.themes.Obsidian
\tuci -q get luci.main.mediaurlbase | grep -q /luci-static/obsidian && \\
\t\tuci set luci.main.mediaurlbase=/luci-static/bootstrap
\tuci commit luci
}
exit 0
"""

CONFFILES = ""  # none


def norm(ti: tarfile.TarInfo) -> tarfile.TarInfo:
    ti.uid = ti.gid = 0
    ti.uname = ti.gname = "root"
    ti.mtime = EPOCH
    return ti


def add_dirs(tar: tarfile.TarFile, seen: set, path: str):
    """Add parent directory entries (./a, ./a/b ...) once, mode 0755."""
    parts = path.strip("/").split("/")[:-1]
    cur = ""
    for p in parts:
        cur = cur + "/" + p if cur else p
        if cur in seen:
            continue
        seen.add(cur)
        ti = tarfile.TarInfo("./" + cur)
        ti.type = tarfile.DIRTYPE
        ti.mode = 0o755
        tar.addfile(norm(ti))


def add_bytes(tar: tarfile.TarFile, name: str, data: bytes, mode: int):
    ti = tarfile.TarInfo("./" + name.lstrip("./"))
    ti.size = len(data)
    ti.mode = mode
    tar.addfile(norm(ti), io.BytesIO(data))


def build_member_targz(add_func) -> bytes:
    """Create a .tar.gz in memory with a deterministic gzip header (mtime=0)."""
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.GNU_FORMAT) as tar:
        add_func(tar)
    gz = io.BytesIO()
    with gzip.GzipFile(fileobj=gz, mode="wb", mtime=0) as g:
        g.write(raw.getvalue())
    return gz.getvalue()


def main():
    # ---- data.tar.gz ----
    installed_size = 0
    seen_dirs = set()

    def add_data(tar):
        nonlocal installed_size
        for src, dest, mode in FILES:
            full = os.path.join(REPO, src.replace("/", os.sep))
            if not os.path.isfile(full):
                sys.exit("ERROR: missing source file: %s" % src)
            with open(full, "rb") as fh:
                data = fh.read().replace(b"\r\n", b"\n")   # normalize CRLF->LF (sh needs LF; reproducible cross-platform)
            installed_size += len(data)
            add_dirs(tar, seen_dirs, dest)
            add_bytes(tar, dest, data, mode)

    data_targz = build_member_targz(add_data)

    # ---- control file ----
    control = (
        "Package: %s\n"
        "Version: %s\n"
        "Depends: %s\n"
        "Source: feeds/luci/themes/%s\n"
        "SourceName: %s\n"
        "License: Apache-2.0\n"
        "Section: %s\n"
        "SourceDateEpoch: %d\n"
        "Maintainer: %s\n"
        "Architecture: %s\n"
        "Installed-Size: %d\n"
        "Description: %s\n"
    ) % (PKG_NAME, VERSION, DEPENDS, PKG_NAME, PKG_NAME, SECTION,
         EPOCH, MAINTAINER, ARCH, installed_size, DESCRIPTION)

    def add_control(tar):
        add_bytes(tar, "control", control.encode("utf-8"), 0o644)
        add_bytes(tar, "postinst", POSTINST.encode("utf-8"), 0o755)
        add_bytes(tar, "postrm", POSTRM.encode("utf-8"), 0o755)
        if CONFFILES:
            add_bytes(tar, "conffiles", CONFFILES.encode("utf-8"), 0o644)

    control_targz = build_member_targz(add_control)

    # ---- outer .ipk (gzipped tar of the three members) ----
    out_dir = os.path.join(REPO, "dist")
    os.makedirs(out_dir, exist_ok=True)
    ipk_path = os.path.join(out_dir, "%s_%s_%s.ipk" % (PKG_NAME, VERSION, ARCH))

    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode="w", format=tarfile.GNU_FORMAT) as tar:
        add_bytes(tar, "debian-binary", b"2.0\n", 0o644)
        add_bytes(tar, "data.tar.gz", data_targz, 0o644)
        add_bytes(tar, "control.tar.gz", control_targz, 0o644)
    with gzip.GzipFile(filename="", fileobj=open(ipk_path, "wb"), mode="wb", mtime=0) as g:
        g.write(raw.getvalue())

    size = os.path.getsize(ipk_path)
    print("Built: %s" % os.path.relpath(ipk_path, REPO))
    print("  package        : %s" % PKG_NAME)
    print("  version        : %s" % VERSION)
    print("  architecture   : %s" % ARCH)
    print("  installed-size : %d bytes (%d files)" % (installed_size, len(FILES)))
    print("  ipk size       : %d bytes" % size)


if __name__ == "__main__":
    main()
