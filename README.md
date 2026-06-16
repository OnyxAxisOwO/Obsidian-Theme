# Obsidian — 一款简洁现代的 OpenWrt / LuCI 主题

> A clean, modern theme for OpenWrt's LuCI web interface — pure monochrome by
> default, optional **Material You** dynamic colour, light / dark mode,
> customizable wallpaper (blur, dim, fit), adjustable content width and elegant
> motion. Pure front‑end: no backend changes.

<p>
  <a href="../../actions/workflows/build.yml"><img alt="Build" src="../../actions/workflows/build.yml/badge.svg"></a>
  <a href="../../releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/OnyxAxisOwO/Obsidian-Theme?sort=semver"></a>
  <img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue">
  <img alt="Arch" src="https://img.shields.io/badge/arch-all-lightgrey">
</p>

## 🔗 在线预览

**[obsidian-openwrt.pages.dev](https://obsidian-openwrt.pages.dev)** — 无需路由器，直接在浏览器里体验完整效果：

- 浏览真实的后台页面（概览 / 接口 / 无线 / 防火墙 / 软件包 / 系统设置…），所有菜单、标签与按钮均可点击；
- 点右下角 **⚙** 打开「设置」，实时切换 **深色 / 浅色**、**Material You 主题色**、更换**壁纸**、调节模糊与内容宽度。

## ⬇️ 下载

| 来源 | 说明 |
|---|---|
| 📦 [**Releases**](../../releases/latest) | **推荐**。下载最新稳定版 `.ipk`（opkg）或 `.apk`（apk-tools 3），每个 `v*` 标签自动发布 |
| 🤖 [**Actions**](../../actions/workflows/build.yml) | 每次提交自动构建，进入最近一次成功的运行 → 底部 **Artifacts** 下载 `luci-theme-obsidian-packages` |

旧固件（有 `opkg`）下 `opkg install *.ipk`；新固件（SNAPSHOT / 25.x 起，用 `apk`）下 `apk add --allow-untrusted *.apk`。详见下方 [安装](#安装)，装完请 **Ctrl+F5 强刷**。

---

Obsidian 为 OpenWrt 路由器后台带来简洁克制的现代美学，默认是**纯黑白高级感**，也可一键开启 **Material You** 整体着色：

- 🌗 **浅色 / 深色 / 自动**：跟随系统，或在内置「设置」面板里一键切换，**无加载闪烁**。
- 🎨 **Material You 主题色**：选一个种子色，按 M3 色调方案自动生成强调色；开启**「全局着色」**后，背景 / 容器 / 顶栏 / 标签 / 边框 / 文字会一起按色相协调着色（明暗各取合适色调）。默认开启，不选色时保持纯黑白。
- 🖼️ **可更换壁纸**：内置渐变预设，支持**图片链接**与**本地上传**（自动缩放重编码，大图 / PNG 也能用）。
- 🧩 **壁纸适应方式**：填充 / 适应 / 拉伸 / 平铺 / 居中（类似 Windows 桌面壁纸）。
- 🌫️ **壁纸模糊 + 暗化**：滑块实时调节（模糊 0–40px、暗化 0–70%），保证内容清晰可读；设了壁纸后容器自动转毛玻璃。
- ↔️ **内容宽度**：标准 / 宽 / 全宽，自适应宽屏。
- ♿ **辅助功能**：减少透明度 / 减少动效，兼容 `prefers-reduced-motion`。
- 📱 **响应式**：桌面、平板、手机自适应。

所有个性化设置保存在浏览器本地（`localStorage`），**按设备 / 按浏览器**生效，不写入路由器配置、不需要后端改动。

---

## 预览（无需路由器即可查看）

最简单的方式是直接打开在线预览 **[obsidian-openwrt.pages.dev](https://obsidian-openwrt.pages.dev)**。

它是一个完整复刻 LuCI 后台的可交互演示（多页面路由、标签、表单、增删行、保存提示一应俱全），且复用主题真实的 `cascade.css` / `obsidian.css` / `obsidian.js`，所见即所得。也可以在本地运行：

```bash
# 在仓库根目录
python -m http.server 8777
# 浏览器打开： http://localhost:8777/
```

点击右下角的**⚙ 图标**打开「设置」，即可切换深浅色、Material You 主题色、更换壁纸、调节模糊度与内容宽度。

> 预览页就是仓库根目录的 [`index.html`](index.html)，部署到 Cloudflare Pages 时把整个仓库作为输出目录即可，站点根路径直接就是预览。

---

## 兼容性

- **需要 ucode 模板的 LuCI**：OpenWrt **23.05 / 24.10 及更新版本**（含 SNAPSHOT）。
  > 旧版基于 Lua 模板的 LuCI（OpenWrt 21.02 及更早）不兼容本主题的模板格式。
- **浏览器**：建议支持 `backdrop-filter`、`color-mix()` 的现代浏览器
  （Safari 16.4+ / Chrome 111+ / Edge 111+ / Firefox 113+）。较旧浏览器仍可使用，仅磨砂 / 混色效果降级。

---

## 安装

> 先看自己的固件用哪个包管理器：有 `opkg` 命令走 **方式一（.ipk）**；OpenWrt SNAPSHOT / 25.x 起改用 `apk`，走 **方式一·apk（.apk）**。两种都不行就用 **方式三** 直接拷贝文件。

### 方式一：安装预构建的 `.ipk`（opkg，最简单，推荐）

从 [**Releases**](../../releases/latest) 下载，或直接用仓库 `dist/` 下的
`luci-theme-obsidian_1.0.6-1_all.ipk`（架构无关 `all`，适用于使用 opkg 的 OpenWrt）：

```sh
# 上传到路由器
scp dist/luci-theme-obsidian_1.0.6-1_all.ipk root@192.168.1.1:/tmp/

# 登录路由器安装
ssh root@192.168.1.1 'opkg install /tmp/luci-theme-obsidian_1.0.6-1_all.ipk'
```

安装脚本会自动注册并把 Obsidian 设为当前主题，刷新浏览器即可。卸载：`opkg remove luci-theme-obsidian`。

### 方式一·apk：安装预构建的 `.apk`（apk-tools 3）

OpenWrt SNAPSHOT / 25.x 起用 `apk` 取代 `opkg`。下载 `dist/` 下的
`luci-theme-obsidian-1.0.6-r1.apk`（同样架构无关 `noarch`）：

```sh
scp dist/luci-theme-obsidian-1.0.6-r1.apk root@192.168.1.1:/tmp/
# 包未签名，本地安装需加 --allow-untrusted（部分 run-from-ram 固件再加 --force-non-repository）
ssh root@192.168.1.1 'apk add --allow-untrusted /tmp/luci-theme-obsidian-1.0.6-r1.apk'
```

卸载：`apk del luci-theme-obsidian`。

> 这个 `.apk` 是符合 APKv3（ADB）格式手工构建的，CI 里用真实的 apk-tools 3（`apk extract`）逐文件校验过；但若你的固件较特殊导致安装异常，随时改用方式三直接拷贝。

> 装 / 升级后请**强制刷新一次（Ctrl+F5）**——LuCI 静态 css/js 不带版本号，浏览器会缓存旧样式。

### 方式二：编译进固件

把本仓库放进 LuCI 源码树的 `themes/` 目录下（Makefile 里 `include ../../luci.mk` 依赖此位置）：

```bash
# 已 clone openwrt 源码并执行过 ./scripts/feeds update -a
git clone https://github.com/OnyxAxisOwO/Obsidian-Theme.git \
    feeds/luci/themes/luci-theme-obsidian

./scripts/feeds install luci-theme-obsidian
make menuconfig      # LuCI → Themes → luci-theme-obsidian = M（或 *）
make package/feeds/luci/luci-theme-obsidian/compile V=s
```

产物在 `bin/packages/<arch>/luci/`，传到路由器后 `opkg install`（或 `apk add`）即可。

### 方式三：免编译，直接拷贝到运行中的设备

| 仓库内文件 | 设备上的目标路径 |
|---|---|
| `htdocs/luci-static/obsidian/*` | `/www/luci-static/obsidian/` |
| `htdocs/luci-static/resources/menu-obsidian.js` | `/www/luci-static/resources/menu-obsidian.js` |
| `ucode/template/themes/obsidian/*.ut` | `/usr/share/ucode/luci/template/themes/obsidian/` |

```bash
ssh root@192.168.1.1 'mkdir -p /www/luci-static/obsidian /usr/share/ucode/luci/template/themes/obsidian'
scp -r htdocs/luci-static/obsidian/*                 root@192.168.1.1:/www/luci-static/obsidian/
scp    htdocs/luci-static/resources/menu-obsidian.js root@192.168.1.1:/www/luci-static/resources/
scp    ucode/template/themes/obsidian/*.ut           root@192.168.1.1:/usr/share/ucode/luci/template/themes/obsidian/
ssh root@192.168.1.1 'uci set luci.themes.Obsidian=/luci-static/obsidian; \
  uci set luci.main.mediaurlbase=/luci-static/obsidian; uci commit luci'
```

> 还原：把 `luci.main.mediaurlbase` 改回 `/luci-static/bootstrap` 并 `uci commit luci`。

---

## 「设置」面板

进入后台后点击**右下角悬浮按钮**：

| 区域 | 功能 |
|---|---|
| **外观** | 自动 / 浅色 / 深色 |
| **主题色 · Material You** | 单色 + 系统色预设 + 自定义取色器；**全局着色**开关（默认开）让整个界面跟随主题色 |
| **壁纸** | 渐变预设 · 图片链接 · 本地上传（自动压缩）· **适应方式**（填充/适应/拉伸/平铺/居中） |
| **壁纸调整** | 模糊（0–40px）· 暗化（0–70%） |
| **内容宽度** | 标准 / 宽 / 全宽 |
| **辅助功能** | 减少透明度 · 减少动效 |
| **关于** | 版本号 + GitHub 仓库链接 |
| **恢复默认** | 一键清空全部个性化设置 |

设置即时生效并自动保存到当前浏览器。

---

## 构建与发布（CI）

无需 OpenWrt SDK，仅需 Python 3（纯标准库）：

```bash
python packaging/build-ipk.py        # 生成 dist/luci-theme-obsidian_<version>_all.ipk（opkg）
python packaging/validate-ipk.py     # 校验 .ipk 结构与安装路径
python packaging/build-apk.py        # 生成 dist/luci-theme-obsidian-<version>.apk（apk-tools 3）
python packaging/validate-apk.py     # 独立重解析 ADB 树，逐文件校验 SHA-256
```

- `.ipk` 本质是 gzip 压缩的 tar，内含 `debian-binary` + `control.tar.gz` + `data.tar.gz`，与 opkg-utils 的 `ipkg-build` 产物布局一致。
- `.apk` 是 APKv3（ADB 二进制）格式：`ADBd` + raw-deflate(`adb_file_header` + 控制 ADB 块 + 各文件 DATA 块)，元数据为二进制值树、每个文件带 SHA-256，未签名（本地安装用 `--allow-untrusted`）。`build-apk.py` 用纯 Python 直接拼出这个二进制格式。

GitHub Actions（[`.github/workflows/build.yml`](.github/workflows/build.yml)）会在每次推送 / PR 时：检查 JS 语法 → 构建 `.ipk` 与 `.apk` → 结构校验 → **用真实的 apk-tools 3（`apk extract`）对 `.apk` 逐文件校验** → 上传为 artifact。**推送 `v*` 标签**时还会自动创建 Release 并附上两种包：

```bash
# 改版本号：build-ipk.py / build-apk.py 的 VERSION、obsidian.js 的 VERSION
git tag v1.0.6 && git push origin v1.0.6
```

---

## 项目结构

```
.
├── Makefile                          # OpenWrt/LuCI 包定义
├── root/etc/uci-defaults/30_luci-theme-obsidian   # 首次安装时注册并启用主题
├── ucode/template/themes/obsidian/
│   ├── header.ut                     # 页头模板（无闪烁初始化：外观/Material You/壁纸/宽度 + 壁纸层）
│   └── footer.ut                     # 页脚模板
├── htdocs/luci-static/
│   ├── obsidian/
│   │   ├── cascade.css               # LuCI 功能基础样式（源自 bootstrap 主题，Apache-2.0）
│   │   ├── mobile.css                # 移动端基础样式
│   │   ├── obsidian.css              # ★ Obsidian 外观层：令牌、玻璃、壁纸、动效、设置面板
│   │   ├── obsidian.js               # ★ 设置引擎 + Material You 色调引擎 + 壁纸压缩
│   │   └── logo.svg                  # 品牌图标
│   └── resources/menu-obsidian.js    # 菜单渲染模块（顶栏/标签/模式菜单）
├── packaging/
│   ├── build-ipk.py                  # 不依赖 SDK 的 .ipk 打包脚本（opkg）
│   ├── build-apk.py                  # 不依赖 SDK 的 .apk 打包脚本（apk-tools 3）
│   ├── validate-ipk.py               # .ipk 结构校验
│   └── validate-apk.py               # .apk 结构校验
├── index.html                        # 可交互在线/离线预览（多页面路由，复用真实主题资源；即 Pages 站点根）
├── dist/                             # 预构建 .ipk / .apk
└── .github/workflows/build.yml       # CI：构建 / 校验 / 发布
```

设计要点：`obsidian.css` **叠加**在 `cascade.css` 之上，绝大多数配色通过覆盖 LuCI 既有的设计令牌
（`--background-color-*` / `--text-color-*` / `--primary-color-*` / `--success/--error/...`）实现，因此对各类
LuCI 组件兼容性很好；Material You 整体着色、玻璃质感、壁纸层与设置中心则作为额外视图层叠加（多为运行时注入的 CSS 变量）。

---

## 致谢与许可

- 本主题以 **Apache License 2.0** 发布（见 [LICENSE](LICENSE)）。
- `cascade.css`、`mobile.css` 与菜单渲染逻辑改编自 OpenWrt 官方
  [`luci-theme-bootstrap`](https://github.com/openwrt/luci)（同为 Apache-2.0），作为功能基础层使用，详见 [NOTICE](NOTICE)。
- Material You 色调取自 [material-foundation/material-color-utilities](https://github.com/material-foundation/material-color-utilities) 的 M3 规范（HSL 近似）。
- 「Obsidian」的外观层、设置中心、色调引擎与预览页为本仓库新增。
