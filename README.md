# Obsidian — 一款苹果风格的 OpenWrt / LuCI 主题

> An Apple‑inspired theme for OpenWrt's LuCI web interface — frosted glass,
> light **and** dark mode, customizable wallpaper with adjustable blur, accent
> colours and elegant motion.

Obsidian 把 macOS / iOS 的「毛玻璃 + 大圆角 + 柔和动效」语言带到 OpenWrt 路由器后台：

- 🌗 **浅色 / 深色 / 自动**：跟随系统，或在内置「个性化」面板里一键切换，且无加载闪烁。
- 🖼️ **可更换壁纸**：内置 11 套精致渐变壁纸，也支持 **图片链接** 或 **本地上传**。
- 🌫️ **壁纸模糊 + 暗化**：滑块实时调节背景模糊度（0–40px）与暗化程度，保证内容清晰可读。
- 🎨 **强调色自定义**：Apple 系统色一键切换，或用取色器选择任意颜色。
- 🪟 **毛玻璃质感**：顶栏、卡片、下拉菜单、面板均为半透明磨砂玻璃（`backdrop-filter`）。
- ✨ **优雅动效**：内容渐入、面板弹簧滑出、按钮按压反馈，并尊重「减少动效」。
- ♿ **辅助功能**：支持「减少透明度」「减少动效」，兼容 `prefers-reduced-motion`。
- 📱 **响应式**：桌面、平板、手机自适应。

所有个性化设置保存在浏览器本地（`localStorage`），**按设备/按浏览器** 生效，不写入路由器配置，也不需要后端改动。

---

## 预览（无需路由器即可查看）

仓库自带一个完整复刻 LuCI 页面结构的离线预览，可在任意现代浏览器中体验全部效果（含个性化面板）：

```bash
# 在仓库根目录
python -m http.server 8777
# 然后浏览器打开：
#   http://localhost:8777/preview/index.html
```

点击右下角的 **滑块图标** 打开「个性化」面板，即可切换深浅色、更换壁纸、调节模糊度与强调色。

---

## 兼容性

- **需要使用 ucode 模板的 LuCI**：OpenWrt **23.05 / 24.10 及更新版本**（含 SNAPSHOT）。
  > 旧版基于 Lua 模板的 LuCI（OpenWrt 21.02 及更早）不兼容本主题的模板格式。
- **浏览器**：需要支持 `backdrop-filter` 与 `color-mix()` 的现代浏览器
  （Safari 16.4+ / Chrome 111+ / Edge 111+ / Firefox 113+）。较旧浏览器仍可使用，仅磨砂/混色效果降级。

---

## 安装

### 方式一：编译进固件（推荐）

把本仓库放进 LuCI 源码树的 `themes/` 目录下（Makefile 里 `include ../../luci.mk` 依赖此位置）：

```bash
# 假设已 clone 了 openwrt 源码并执行过 ./scripts/feeds update -a
git clone https://github.com/<you>/Obsidian-Theme.git \
    feeds/luci/themes/luci-theme-obsidian

./scripts/feeds install luci-theme-obsidian
make menuconfig      # LuCI → Themes → luci-theme-obsidian = M（或 *）
make package/feeds/luci/luci-theme-obsidian/compile V=s
```

生成的 `.ipk` / `.apk` 位于 `bin/packages/<arch>/luci/`，传到路由器后 `opkg install`（或 `apk add`）即可。

### 方式二：免编译，直接拷贝到运行中的设备

适合快速试用。把文件复制到设备对应路径（路径基于 LuCI 的标准布局）：

| 仓库内文件 | 设备上的目标路径 |
|---|---|
| `htdocs/luci-static/obsidian/*` | `/www/luci-static/obsidian/` |
| `htdocs/luci-static/resources/menu-obsidian.js` | `/www/luci-static/resources/menu-obsidian.js` |
| `ucode/template/themes/obsidian/*.ut` | `/usr/share/ucode/luci/template/themes/obsidian/` |

例如用 `scp`：

```bash
ssh root@192.168.1.1 'mkdir -p /www/luci-static/obsidian \
  /usr/share/ucode/luci/template/themes/obsidian'

scp -r htdocs/luci-static/obsidian/*           root@192.168.1.1:/www/luci-static/obsidian/
scp    htdocs/luci-static/resources/menu-obsidian.js root@192.168.1.1:/www/luci-static/resources/
scp    ucode/template/themes/obsidian/*.ut     root@192.168.1.1:/usr/share/ucode/luci/template/themes/obsidian/
```

然后在路由器上注册并启用主题：

```sh
uci set luci.themes.Obsidian=/luci-static/obsidian
uci set luci.main.mediaurlbase=/luci-static/obsidian
uci commit luci
```

刷新浏览器即可。也可以之后在 **系统 → System → 语言和外观（Language and Style）** 里切换主题。

> 卸载 / 还原：把 `luci.main.mediaurlbase` 改回 `/luci-static/bootstrap` 并 `uci commit luci`。

---

## 使用「个性化」面板

进入后台后，点击 **右下角的悬浮按钮**：

| 区域 | 功能 |
|---|---|
| **外观** | 自动 / 浅色 / 深色 |
| **强调色** | Apple 系统色 + 自定义取色器 |
| **壁纸** | 11 套渐变预设 · 图片链接 · 本地上传（≤4MB） |
| **壁纸调整** | 模糊（0–40px）· 暗化（0–70%） |
| **辅助功能** | 减少透明度 · 减少动效 |
| **恢复默认** | 一键清空全部个性化设置 |

设置即时生效并自动保存到当前浏览器。

---

## 项目结构

```
.
├── Makefile                         # OpenWrt/LuCI 包定义
├── root/etc/uci-defaults/30_luci-theme-obsidian   # 首次安装时注册并启用主题
├── ucode/template/themes/obsidian/
│   ├── header.ut                    # 页头模板（含无闪烁初始化脚本、壁纸层）
│   └── footer.ut                    # 页脚模板
├── htdocs/luci-static/
│   ├── obsidian/
│   │   ├── cascade.css              # LuCI 功能基础样式（源自 bootstrap 主题，Apache-2.0）
│   │   ├── mobile.css               # 移动端基础样式
│   │   ├── obsidian.css             # ★ Obsidian 外观层：玻璃、壁纸、动效、个性化面板
│   │   ├── obsidian.js              # ★ 个性化「控制中心」引擎（原生 JS）
│   │   └── logo.svg                 # 品牌图标
│   └── resources/menu-obsidian.js   # 菜单渲染模块（顶栏/标签/模式菜单）
└── preview/index.html               # 离线预览页（复刻 LuCI DOM）
```

设计要点：`obsidian.css` **叠加** 在 `cascade.css` 之上，绝大多数配色通过覆盖 LuCI 既有的
HSL 设计令牌（`--background-color-*` / `--text-color-*` / `--primary-color-*`）实现，因此对各类
LuCI 组件的兼容性很好；玻璃质感、壁纸层与控制中心则是额外叠加的视图层。

---

## 致谢与许可

- 本主题以 **Apache License 2.0** 发布（见 [LICENSE](LICENSE)）。
- `cascade.css`、`mobile.css` 与菜单渲染逻辑改编自 OpenWrt 官方
  [`luci-theme-bootstrap`](https://github.com/openwrt/luci)（同为 Apache-2.0），作为功能基础层使用，
  详见 [NOTICE](NOTICE)。
- “Obsidian” 的玻璃/壁纸/动效外观层、个性化控制中心与预览页为本仓库新增。
