# Obsidian — OpenWrt / LuCI 主题

简洁现代的 LuCI 主题，纯黑白高级感，可选 Material You 动态主题色。纯前端，不修改后端。

<p>
  <a href="../../actions/workflows/build.yml"><img alt="Build" src="../../actions/workflows/build.yml/badge.svg"></a>
  <a href="../../releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/OnyxAxisOwO/Obsidian-Theme?sort=semver"></a>
  <img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue">
</p>

**在线预览：[obsidian-openwrt.pages.dev](https://obsidian-openwrt.pages.dev)**（无需路由器，右下角⚙可实时调整外观）

---

## 下载

| 来源 | 说明 |
|---|---|
| [**Releases**](../../releases/latest) | 稳定版，推荐 |
| [**Actions**](../../actions/workflows/build.yml) | 每次提交自动构建 → 进入最新成功的运行 → 底部 **Artifacts** 下载 |

两种包格式，均无需 OpenWrt SDK：

- **`.ipk`**：适用于有 `opkg` 的固件（OpenWrt 23.05 / 24.10）
- **`.apk`**：适用于有 `apk` 的固件（OpenWrt SNAPSHOT / 25.x）

---

## 安装

### opkg（.ipk）

```sh
scp luci-theme-obsidian_*.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 'opkg install /tmp/luci-theme-obsidian_*.ipk'
```

卸载：`opkg remove luci-theme-obsidian`

### apk（.apk）

```sh
scp luci-theme-obsidian-*.apk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 'apk add --allow-untrusted /tmp/luci-theme-obsidian-*.apk'
```

卸载：`apk del luci-theme-obsidian`

> 安装或升级后请 **Ctrl+F5 强制刷新**，LuCI 静态资源不带版本号，浏览器会缓存旧样式。

### 直接拷贝（无包管理器）

| 仓库路径 | 设备路径 |
|---|---|
| `htdocs/luci-static/obsidian/*` | `/www/luci-static/obsidian/` |
| `htdocs/luci-static/resources/menu-obsidian.js` | `/www/luci-static/resources/` |
| `ucode/template/themes/obsidian/*.ut` | `/usr/share/ucode/luci/template/themes/obsidian/` |

拷贝完后执行：

```sh
ssh root@192.168.1.1 'uci set luci.main.mediaurlbase=/luci-static/obsidian; uci commit luci'
```

---

## 功能

- **浅色 / 深色 / 跟随系统**，无加载闪烁
- **Material You 主题色**，可开启全局着色让整个界面跟随主题色
- **壁纸**：渐变预设 / 图片链接 / 本地上传（自动压缩）
- **壁纸适应**：填充 / 适应 / 拉伸 / 平铺 / 居中
- **模糊 + 暗化**调节（0–40px / 0–70%）
- **内容宽度**：标准 / 宽 / 全宽
- **辅助功能**：减少透明度 / 减少动效
- **响应式**：桌面、平板、手机均适配

所有设置保存在浏览器 `localStorage`，不写入路由器配置。

---

## 兼容性

- **LuCI**：需要 ucode 模板（OpenWrt 23.05 / 24.10 / SNAPSHOT）；不支持 21.02 及更早
- **浏览器**：Chrome 111+ / Edge 111+ / Safari 16.4+ / Firefox 113+；旧版可用，仅磨砂/混色降级

---

## 本地预览

```bash
python -m http.server 8777
# 浏览器打开 http://localhost:8777/
```

---

## 许可

Apache License 2.0 — 详见 [LICENSE](LICENSE)

`cascade.css`、`mobile.css` 与菜单渲染逻辑改编自 [luci-theme-bootstrap](https://github.com/openwrt/luci)（同为 Apache-2.0），详见 [NOTICE](NOTICE)。
