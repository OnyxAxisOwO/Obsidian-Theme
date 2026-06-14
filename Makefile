#
# Obsidian — an Apple-inspired LuCI theme.
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Obsidian Theme (Apple-inspired, light/dark, custom wallpaper)
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Obsidian Theme contributors

define Package/luci-theme-obsidian/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.Obsidian
	uci commit luci
}
endef

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
