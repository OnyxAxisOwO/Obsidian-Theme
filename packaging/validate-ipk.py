#!/usr/bin/env python3
"""
Validate an opkg .ipk produced by build-ipk.py — used by CI and locally.

Checks the outer gzip-tar container, the three members, the control metadata,
and that the payload installs to the expected on-device paths. Exits non-zero
with a clear message on any problem.

Usage:
    python packaging/validate-ipk.py [path/to/package.ipk]
If no path is given, the newest *.ipk under dist/ is validated.
"""

import glob
import io
import os
import sys
import tarfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED_CONTROL_FIELDS = ("Package", "Version", "Architecture")
EXPECTED_PATH_PREFIXES = (
    "./www/luci-static/obsidian/",
    "./www/luci-static/resources/",
    "./usr/share/ucode/luci/template/themes/obsidian/",
    "./etc/uci-defaults/",
)


def fail(msg):
    print("FAIL: %s" % msg)
    sys.exit(1)


def find_ipk():
    if len(sys.argv) > 1:
        return sys.argv[1]
    matches = sorted(glob.glob(os.path.join(REPO, "dist", "*.ipk")), key=os.path.getmtime)
    if not matches:
        fail("no .ipk found in dist/ (run packaging/build-ipk.py first)")
    return matches[-1]


def open_targz(data):
    return tarfile.open(fileobj=io.BytesIO(data))


def main():
    ipk = find_ipk()
    print("Validating %s" % os.path.relpath(ipk, REPO))

    with open(ipk, "rb") as fh:
        outer = fh.read()

    if outer[:2] != b"\x1f\x8b":
        fail("outer container is not gzip (expected magic 1f8b)")

    try:
        with open_targz(outer) as tar:
            names = tar.getnames()
            members = {os.path.basename(n): n for n in names}
            for required in ("debian-binary", "control.tar.gz", "data.tar.gz"):
                if required not in members:
                    fail("outer archive missing ./%s (has: %s)" % (required, names))
            debian_binary = tar.extractfile(members["debian-binary"]).read()
            control_gz = tar.extractfile(members["control.tar.gz"]).read()
            data_gz = tar.extractfile(members["data.tar.gz"]).read()
    except tarfile.TarError as e:
        fail("outer archive is not a valid tar: %s" % e)

    if debian_binary.strip() != b"2.0":
        fail("debian-binary must contain '2.0', got %r" % debian_binary)

    # ---- control ----
    with open_targz(control_gz) as tar:
        cnames = {os.path.basename(n): n for n in tar.getnames()}
        if "control" not in cnames:
            fail("control.tar.gz missing ./control")
        control = tar.extractfile(cnames["control"]).read().decode("utf-8", "replace")
        fields = {}
        for line in control.splitlines():
            if ": " in line and not line.startswith(" "):
                k, v = line.split(": ", 1)
                fields[k] = v
        for f in REQUIRED_CONTROL_FIELDS:
            if f not in fields or not fields[f].strip():
                fail("control missing required field: %s" % f)
        for script in ("postinst", "postrm"):
            if script in cnames:
                m = tar.getmember(cnames[script])
                if (m.mode & 0o111) == 0:
                    fail("%s is not executable (mode %o)" % (script, m.mode))
        print("  package        : %s" % fields.get("Package"))
        print("  version        : %s" % fields.get("Version"))
        print("  architecture   : %s" % fields.get("Architecture"))

    # ---- data ----
    file_count = 0
    with open_targz(data_gz) as tar:
        for m in tar.getmembers():
            if m.isdir():
                continue
            file_count += 1
            if m.uid != 0 or m.gid != 0:
                fail("%s is not owned by root:root (uid=%s gid=%s)" % (m.name, m.uid, m.gid))
            if not any(m.name.startswith(p) for p in EXPECTED_PATH_PREFIXES):
                fail("unexpected install path: %s" % m.name)
        # spot-check the essential files are present
        flat = set(tar.getnames())
        essentials = [
            "./www/luci-static/obsidian/obsidian.css",
            "./www/luci-static/obsidian/obsidian.js",
            "./www/luci-static/resources/menu-obsidian.js",
            "./usr/share/ucode/luci/template/themes/obsidian/header.ut",
            "./usr/share/ucode/luci/template/themes/obsidian/footer.ut",
            "./etc/uci-defaults/30_luci-theme-obsidian",
        ]
        for e in essentials:
            if e not in flat:
                fail("payload missing essential file: %s" % e)

    print("  payload files  : %d" % file_count)
    print("OK: .ipk is structurally valid and installs to the expected paths.")


if __name__ == "__main__":
    main()
