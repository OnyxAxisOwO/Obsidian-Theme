/*!
 * Obsidian Settings (Control Center)
 * Personalization engine for the Obsidian LuCI theme:
 * appearance (auto/light/dark), Material-You accent, wallpaper, blur, dim,
 * content width. Plain vanilla JS — also runs in the standalone preview.
 * Licensed under the Apache License 2.0.
 */
(function () {
	"use strict";

	if (window.__obsidianControlCenter) return;
	window.__obsidianControlCenter = true;

	var VERSION = "1.0.7";
	var GITHUB = "https://github.com/OnyxAxisOwO/Obsidian-Theme";

	var root = document.documentElement;

	/* ---- persistence helpers -------------------------------------------- */
	var KEY = {
		appearance: "obsidian.appearance",
		accent: "obsidian.accent",          /* stores a seed colour ("" = monochrome) */
		wallpaper: "obsidian.wallpaper",
		wpfit: "obsidian.wpfit",
		blur: "obsidian.blur",
		dim: "obsidian.dim",
		width: "obsidian.width",
		themeGlobal: "obsidian.themeGlobal",   /* 1 = apply seed colour to ALL surfaces */
		reduceTransparency: "obsidian.reduceTransparency",
		reduceMotion: "obsidian.reduceMotion"
	};
	function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
	function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

	/* ---- Material-You tonal engine -------------------------------------- *
	 * From one seed colour, derive a mode-appropriate accent always, and a
	 * full Material-3 surface scheme when "global" is on. Tone values follow
	 * the M3 reference spec (TonalSpot); we approximate HCT with HSL where a
	 * tone T maps to lightness T% and the neutral palettes use low saturation.
	 * Refs: m3.material.io/styles/color, material-color-utilities color_spec. */
	function parseSeed(seed) {
		var m = /^#?([0-9a-fA-F]{6})$/.exec((seed || "").trim());
		if (!m) return null;
		var n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
		var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0, s = 0, l = (mx + mn) / 2;
		if (d) {
			s = d / (1 - Math.abs(2 * l - 1));
			h = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
			if (h < 0) h += 360;
		}
		return { h: h, s: s };
	}
	function hslToRgb(h, s, l) {
		var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
		if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
		else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
		else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
		return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
	}
	function hslc(h, s, l) { return "hsl(" + Math.round(h) + ", " + Math.round(s * 100) + "%, " + Math.round(l * 100) + "%)"; }

	function obScheme(seed, dark, global) {
		var p = parseSeed(seed);
		if (!p) return null;
		/* Achromatic seed (grey/white/black) → stay neutral; otherwise the
		   0.32 saturation floor would turn a grey pick into a red tint. */
		var achroma = p.s < 0.08;
		var h = p.h, s = achroma ? 0 : Math.max(0.32, Math.min(0.85, p.s));
		var sN = achroma ? 0 : 0.06, sV = achroma ? 0 : 0.12;
		var rgb = hslToRgb(h, s, dark ? 0.80 : 0.42);
		var v = {
			"--ob-accent": "rgb(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")",
			"--ob-accent-rgb": rgb[0] + ", " + rgb[1] + ", " + rgb[2],
			"--ob-accent-press": hslc(h, s, dark ? 0.70 : 0.34),
			"--ob-accent-soft": hslc(h, Math.min(s, 0.55), dark ? 0.30 : 0.90),
			"--ob-on-accent": dark ? "#0a0a0a" : "#ffffff"
		};
		if (global) {
			v["--ob-bg"] = hslc(h, sN, dark ? 0.06 : 0.96);
			v["--ob-card"] = hslc(h, sN, dark ? 0.12 : 0.99);
			v["--ob-card-2"] = hslc(h, sN, dark ? 0.17 : 0.94);
			v["--ob-card-strong"] = hslc(h, sN, dark ? 0.20 : 1.00);
			v["--ob-bar"] = "hsla(" + Math.round(h) + ", " + Math.round(sN * 100) + "%, " + (dark ? 6 : 98) + "%, 0.82)";
			v["--ob-elevated"] = hslc(h, sN, dark ? 0.18 : 0.99);
			v["--ob-hairline"] = hslc(h, sV, dark ? 0.30 : 0.82);
			v["--ob-hairline-strong"] = hslc(h, sV, dark ? 0.42 : 0.68);
			v["--ob-fill"] = hslc(h, sN, dark ? 0.17 : 0.94);
			v["--ob-fill-hover"] = hslc(h, sN, dark ? 0.24 : 0.90);
			v["--ob-text"] = hslc(h, sN, dark ? 0.92 : 0.10);
			v["--ob-text-2"] = hslc(h, sV, dark ? 0.80 : 0.30);
			v["--ob-text-3"] = hslc(h, sV, dark ? 0.60 : 0.50);
		}
		return v;
	}

	/* ---- presets -------------------------------------------------------- */
	/* Accent seeds (run through the tonal engine). "" = monochrome. */
	var ACCENTS = [
		{ id: "mono",   name: "单色", value: "" },
		{ id: "blue",   name: "蓝",   value: "#3b6ef0" },
		{ id: "indigo", name: "靛蓝", value: "#5b5ce0" },
		{ id: "violet", name: "紫",   value: "#7c5cdb" },
		{ id: "pink",   name: "粉",   value: "#d9569b" },
		{ id: "red",    name: "红",   value: "#d65151" },
		{ id: "orange", name: "橙",   value: "#cf7a2e" },
		{ id: "amber",  name: "琥珀", value: "#bd9418" },
		{ id: "green",  name: "绿",   value: "#3a9e63" },
		{ id: "teal",   name: "青",   value: "#2a9d9d" }
	];

	var WALLPAPERS = [
		{ id: "auto", name: "无", value: "",
		  thumb: "linear-gradient(135deg,#f1f1f2 0 50%,#111113 50% 100%)" },
		{ id: "aurora", name: "极光",
		  value: "radial-gradient(at 12% 18%,#e9efff 0,transparent 55%),radial-gradient(at 86% 12%,#ffe7f1 0,transparent 50%),radial-gradient(at 78% 86%,#e4fbff 0,transparent 52%),radial-gradient(at 22% 82%,#efe9ff 0,transparent 55%),linear-gradient(135deg,#f5f7fb,#eef1f8)" },
		{ id: "midnight", name: "午夜",
		  value: "radial-gradient(at 20% 20%,#26365f 0,transparent 55%),radial-gradient(at 82% 26%,#3d2360 0,transparent 52%),radial-gradient(at 78% 88%,#0e3340 0,transparent 50%),linear-gradient(135deg,#0b0d14,#151a2c)" },
		{ id: "sky", name: "晴空",
		  value: "linear-gradient(160deg,#9ec9ff,#d7e9ff 55%,#eef5ff)" },
		{ id: "sunset", name: "日落",
		  value: "linear-gradient(160deg,#ff9a8b 0,#ff6a88 48%,#ff99ac 100%)" },
		{ id: "grape", name: "葡萄",
		  value: "linear-gradient(160deg,#6d6cff,#9a6bff 50%,#d18bff)" },
		{ id: "mint", name: "薄荷",
		  value: "radial-gradient(at 18% 20%,#c6ffe6 0,transparent 60%),linear-gradient(160deg,#9ff5cf,#c8ffe6 55%,#e6fff4)" },
		{ id: "ocean", name: "深海",
		  value: "linear-gradient(160deg,#1a5276 0,#2193b0 50%,#6dd5ed 100%)" },
		{ id: "sand", name: "暖沙",
		  value: "linear-gradient(160deg,#f6d365 0,#fda085 100%)" },
		{ id: "graphite", name: "石墨",
		  value: "linear-gradient(160deg,#3a3a3f,#1c1c20)" }
	];

	var WIDTHS = [["1320px", "标准"], ["1600px", "宽"], ["100%", "全宽"]];
	var DEFAULT_WIDTH = "1320px";
	var WPFITS = [["cover", "填充"], ["contain", "适应"], ["stretch", "拉伸"], ["tile", "平铺"], ["center", "居中"]];
	var DEFAULT_FIT = "cover";

	var mq = window.matchMedia("(prefers-color-scheme: dark)");
	function isDark() { return root.getAttribute("data-darkmode") === "true"; }

	/* ---- apply state to the DOM ----------------------------------------- */
	function isGlobal() { return lsGet(KEY.themeGlobal, "1") === "1"; }   /* 全局着色 default ON */

	function applyAppearance(mode) {
		var dark = mode === "dark" ? true : mode === "light" ? false : mq.matches;
		root.setAttribute("data-darkmode", dark ? "true" : "false");
		root.setAttribute("data-appearance", mode);
		var seed = lsGet(KEY.accent, "");
		if (seed) applyTheme(seed, isGlobal());   /* re-tone for the new mode */
	}
	function onSystemChange() { if (lsGet(KEY.appearance, "auto") === "auto") applyAppearance("auto"); }
	try { mq.addEventListener("change", onSystemChange); } catch (e) { try { mq.addListener(onSystemChange); } catch (e2) {} }

	var ACCENT_VARS = ["--ob-accent", "--ob-accent-rgb", "--ob-accent-press", "--ob-accent-soft", "--ob-on-accent"];
	var SURFACE_VARS = ["--ob-bg", "--ob-card", "--ob-card-2", "--ob-card-strong", "--ob-bar", "--ob-elevated",
		"--ob-hairline", "--ob-hairline-strong", "--ob-fill", "--ob-fill-hover", "--ob-text", "--ob-text-2", "--ob-text-3"];
	function applyTheme(seed, global) {
		if (!seed) { ACCENT_VARS.concat(SURFACE_VARS).forEach(function (p) { root.style.removeProperty(p); }); return; }
		var v = obScheme(seed, isDark(), global);
		if (!v) return;
		ACCENT_VARS.forEach(function (p) { if (v[p] != null) root.style.setProperty(p, v[p]); });
		if (global) SURFACE_VARS.forEach(function (p) { if (v[p] != null) root.style.setProperty(p, v[p]); });
		else SURFACE_VARS.forEach(function (p) { root.style.removeProperty(p); });
	}
	function applyWallpaper(v) {
		if (v) { root.style.setProperty("--ob-wallpaper", v); root.setAttribute("data-has-wallpaper", ""); }
		else { root.style.removeProperty("--ob-wallpaper"); root.removeAttribute("data-has-wallpaper"); }
	}
	function applyBlur(px) { root.style.setProperty("--ob-wallpaper-blur", (px || 0) + "px"); }
	function applyDim(v) { root.style.setProperty("--ob-wallpaper-dim", v || 0); }
	/* Wallpaper fit: maps a key to background-size + background-repeat. */
	var WP_FIT = {
		cover:   { size: "cover",      repeat: "no-repeat" },   /* 填充 */
		contain: { size: "contain",    repeat: "no-repeat" },   /* 适应 */
		stretch: { size: "100% 100%",  repeat: "no-repeat" },   /* 拉伸 */
		tile:    { size: "auto",       repeat: "repeat" },      /* 平铺 */
		center:  { size: "auto",       repeat: "no-repeat" }    /* 居中 */
	};
	function applyWpFit(key) {
		var f = WP_FIT[key];
		if (!f) { root.style.removeProperty("--ob-wallpaper-size"); root.style.removeProperty("--ob-wallpaper-repeat"); return; }
		root.style.setProperty("--ob-wallpaper-size", f.size);
		root.style.setProperty("--ob-wallpaper-repeat", f.repeat);
	}
	function applyWidth(v) { if (v) root.style.setProperty("--ob-content-width", v); else root.style.removeProperty("--ob-content-width"); }
	function applyToggle(attr, on) { if (on) root.setAttribute(attr, ""); else root.removeAttribute(attr); }

	/* ---- wallpaper image re-encoder ------------------------------------- *
	 * Uploads are downscaled + re-encoded so even big PNGs fit the localStorage
	 * budget (the real reason "PNG didn't work" — base64 quota, not format).   */
	var WP_BUDGET = 3.8 * 1024 * 1024;                 /* keep dataURL under ~3.8MB */
	var WP_STEPS = [[2560, 0.82], [2048, 0.80], [1600, 0.78], [1280, 0.74], [1024, 0.70]];
	function canvasSupportsWebp() {
		try {
			var c = document.createElement("canvas"); c.width = c.height = 1;
			return c.toDataURL("image/webp").indexOf("data:image/webp") === 0;
		} catch (e) { return false; }
	}
	function encodeWallpaper(img, mayHaveAlpha) {
		var webp = mayHaveAlpha && canvasSupportsWebp();
		var mime = webp ? "image/webp" : (mayHaveAlpha ? "image/png" : "image/jpeg");
		var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
		if (!iw || !ih) return "";
		for (var i = 0; i < WP_STEPS.length; i++) {
			var maxSide = WP_STEPS[i][0], q = WP_STEPS[i][1];
			var scale = Math.min(1, maxSide / Math.max(iw, ih));
			var w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
			var canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
			var ctx = canvas.getContext("2d");
			if (!ctx) return "";
			if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
			ctx.drawImage(img, 0, 0, w, h);
			var url;
			try { url = (mime === "image/png") ? canvas.toDataURL(mime) : canvas.toDataURL(mime, q); }
			catch (e) { return ""; }
			if (url && url.length <= WP_BUDGET) return url;
		}
		return "";
	}

	/* ---- icons ---------------------------------------------------------- */
	var ICON_FAB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="7" r="2.2"/><circle cx="16" cy="17" r="2.2"/><line x1="3" y1="7" x2="6" y2="7"/><line x1="10" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="14" y2="17"/><line x1="18" y1="17" x2="21" y2="17"/></svg>';

	/* ---- build helpers -------------------------------------------------- */
	function el(tag, attrs, children) {
		var n = document.createElement(tag);
		if (attrs) for (var k in attrs) {
			if (k === "html") n.innerHTML = attrs[k];
			else if (k === "text") n.textContent = attrs[k];
			else if (k === "style") n.setAttribute("style", attrs[k]);
			else n.setAttribute(k, attrs[k]);
		}
		(children || []).forEach(function (c) { if (c) n.appendChild(c); });
		return n;
	}
	function group(label, body) {
		var g = el("div", { "class": "ob-group" });
		if (label) g.appendChild(el("div", { "class": "ob-group-label", text: label }));
		body.forEach(function (b) { g.appendChild(b); });
		return g;
	}
	function segment(items, getKey, onPick) {
		var seg = el("div", { "class": "ob-seg", role: "group" });
		var btns = {};
		items.forEach(function (it) {
			var b = el("button", { type: "button", text: it[1], "aria-pressed": "false" });
			b.addEventListener("click", function () { onPick(it[0]); });
			btns[it[0]] = b;
			seg.appendChild(b);
		});
		return { seg: seg, reflect: function (k) { for (var x in btns) btns[x].setAttribute("aria-pressed", x === k ? "true" : "false"); } };
	}

	/* ---- build the Settings panel --------------------------------------- */
	function build() {
		if (document.getElementById("ob-fab")) return;

		var fab = el("button", { id: "ob-fab", type: "button", "aria-label": "设置", title: "设置", "aria-expanded": "false", html: ICON_FAB });
		var scrim = el("div", { id: "ob-scrim" });
		var panel = el("div", { id: "ob-panel", role: "dialog", "aria-label": "设置", "aria-modal": "true" });

		var closeBtn = el("button", { "class": "ob-panel-close", "aria-label": "关闭", html: "&times;" });
		panel.appendChild(el("div", { "class": "ob-panel-head" }, [
			el("div", { "class": "ob-panel-title", text: "设置" }),
			closeBtn
		]));

		var body = el("div", { "class": "ob-panel-body" });
		panel.appendChild(body);

		/* --- Appearance --- */
		var appSeg = segment([["auto", "自动"], ["light", "浅色"], ["dark", "深色"]], null, function (m) { setAppearance(m); });
		body.appendChild(group("外观", [appSeg.seg]));

		/* --- Accent (Material You) --- */
		var swatches = el("div", { "class": "ob-swatches" });
		var swatchEls = {};
		ACCENTS.forEach(function (a) {
			var isMono = !a.value;
			var bg = isMono ? "linear-gradient(135deg,#1d1d1f 0 50%,#f2f2f2 50% 100%)" : a.value;
			var ring = isMono ? "var(--ob-text-3)" : a.value;
			var s = el("button", { type: "button", "class": "ob-swatch", title: a.name, "aria-pressed": "false",
				style: "background:" + bg + ";color:" + ring });
			s.addEventListener("click", function () { setAccent(a.value); });
			swatchEls[a.value || "mono"] = s;
			swatches.appendChild(s);
		});
		var colorInput = el("input", { type: "color", value: "#3b6ef0", "aria-label": "自定义主题色" });
		var custom = el("button", { type: "button", "class": "ob-swatch ob-swatch-custom", title: "自定义", html: "+" }, [colorInput]);
		colorInput.addEventListener("input", function () { setAccent(colorInput.value); });
		custom.addEventListener("click", function (e) { if (e.target === custom) colorInput.click(); });
		swatches.appendChild(custom);
		var globalSw = switchRow("全局着色 · 背景 / 容器 / 标签栏一起变色", function (on) { setGlobal(on); });
		body.appendChild(group("主题色 · Material You", [swatches, globalSw.row]));

		/* --- Wallpaper --- */
		var grid = el("div", { "class": "ob-wp-grid" });
		var wpEls = {};
		WALLPAPERS.forEach(function (w) {
			var t = el("button", { type: "button", "class": "ob-wp", title: w.name, "aria-pressed": "false",
				style: "background-image:" + (w.thumb || w.value) });
			t.addEventListener("click", function () { setWallpaper(w.value); });
			wpEls[w.value || "auto"] = t;
			grid.appendChild(t);
		});
		var urlField = el("input", { type: "url", "class": "ob-field", placeholder: "粘贴图片链接 (https://…)" });
		var urlBtn = el("button", { type: "button", "class": "ob-btn ob-btn-accent", text: "应用" });
		urlBtn.addEventListener("click", function () {
			var u = urlField.value.trim();
			if (u) setWallpaper('url("' + u.replace(/"/g, "%22") + '")');
		});
		urlField.addEventListener("keydown", function (e) { if (e.key === "Enter") urlBtn.click(); });

		var fileInput = el("input", { type: "file", accept: "image/*", style: "display:none" });
		var uploadBtn = el("button", { type: "button", "class": "ob-btn", text: "上传图片" });
		uploadBtn.addEventListener("click", function () { fileInput.click(); });
		var uploadHint = el("div", { "class": "ob-hint" });
		fileInput.addEventListener("change", function () {
			var f = fileInput.files && fileInput.files[0];
			fileInput.value = "";                 /* allow re-picking the same file */
			if (!f) return;
			if (!/^image\//.test(f.type || "")) { uploadHint.textContent = "请选择图片文件。"; return; }
			if (f.size > 25 * 1024 * 1024) { uploadHint.textContent = "图片过大，请选择小于 25MB 的图片。"; return; }
			uploadHint.textContent = "正在处理图片…";
			var mayHaveAlpha = !/jpe?g$/i.test(f.type || "");
			var r = new FileReader();
			r.onload = function () {
				var img = new Image();
				img.onload = function () {
					var url = encodeWallpaper(img, mayHaveAlpha);
					if (!url) { uploadHint.textContent = "图片太大，无法保存（受浏览器本地存储限制），请改用图片链接。"; return; }
					var css = 'url("' + url + '")';
					var prevWp = lsGet(KEY.wallpaper, "");
					setWallpaper(css);
					if (lsGet(KEY.wallpaper, "") !== css) {   /* quota error swallowed in lsSet → restore prior state */
						setWallpaper(prevWp);
						uploadHint.textContent = "无法保存该图片（超出本地存储限制），请改用图片链接。"; return;
					}
					uploadHint.textContent = "已设置自定义壁纸。";
				};
				img.onerror = function () { uploadHint.textContent = "无法解码该图片。"; };
				img.src = r.result;
			};
			r.onerror = function () { uploadHint.textContent = "读取图片失败。"; };
			r.readAsDataURL(f);
		});
		var fitSeg = segment(WPFITS, null, function (k) { setWpFit(k); });
		body.appendChild(group("壁纸", [
			grid,
			el("div", { "class": "ob-wp-actions" }, [urlField, urlBtn]),
			el("div", { "class": "ob-wp-actions" }, [uploadBtn, fileInput]),
			uploadHint,
			el("div", { "class": "ob-group-label", style: "margin-top:4px", text: "适应方式" }),
			fitSeg.seg
		]));

		/* --- Blur & Dim --- */
		var blurRange = el("input", { type: "range", "class": "ob-range", min: "0", max: "40", step: "1" });
		var blurVal = el("span", { "class": "ob-range-val" });
		blurRange.addEventListener("input", function () { setBlur(blurRange.value, blurVal); });
		var dimRange = el("input", { type: "range", "class": "ob-range", min: "0", max: "70", step: "1" });
		var dimVal = el("span", { "class": "ob-range-val" });
		dimRange.addEventListener("input", function () { setDim(dimRange.value, dimVal); });
		body.appendChild(group("壁纸调整", [
			el("div", { "class": "ob-slider-row" }, [el("label", { text: "模糊" }), blurRange, blurVal]),
			el("div", { "class": "ob-slider-row" }, [el("label", { text: "暗化" }), dimRange, dimVal])
		]));

		/* --- Content width --- */
		var widthSeg = segment(WIDTHS, null, function (w) { setWidth(w); });
		body.appendChild(group("内容宽度", [widthSeg.seg]));

		/* --- Accessibility toggles --- */
		var rt = switchRow("减少透明度", function (on) {
			applyToggle("data-reduce-transparency", on); lsSet(KEY.reduceTransparency, on ? "1" : "0");
		});
		var rm = switchRow("减少动效", function (on) {
			applyToggle("data-reduce-motion", on); lsSet(KEY.reduceMotion, on ? "1" : "0");
		});
		body.appendChild(group("辅助功能", [rt.row, rm.row]));

		/* --- About --- */
		var ver = el("div", { "class": "ob-about-ver", text: "Obsidian 主题 · v" + VERSION });
		var gh = el("a", { "class": "ob-about-link", href: GITHUB, target: "_blank", rel: "noreferrer", text: "GitHub 仓库 ↗" });
		body.appendChild(group("关于", [ver, gh]));

		/* --- Reset --- */
		var resetBtn = el("button", { type: "button", "class": "ob-btn", text: "恢复默认" });
		resetBtn.addEventListener("click", resetAll);
		body.appendChild(el("div", { "class": "ob-panel-foot" }, [resetBtn]));

		document.body.appendChild(fab);
		document.body.appendChild(scrim);
		document.body.appendChild(panel);

		/* ---- reflect helpers ---- */
		function reflectAccent(val) {
			for (var k in swatchEls) swatchEls[k].setAttribute("aria-pressed", "false");
			var key = val || "mono";
			if (swatchEls[key]) swatchEls[key].setAttribute("aria-pressed", "true");
			if (val && /^#([0-9a-f]{6})$/i.test(val)) colorInput.value = val;
		}
		function reflectWallpaper(val) {
			for (var k in wpEls) wpEls[k].setAttribute("aria-pressed", "false");
			var key = val || "auto";
			if (wpEls[key]) wpEls[key].setAttribute("aria-pressed", "true");
		}

		/* ---- setters ---- */
		function setAppearance(mode) { applyAppearance(mode); lsSet(KEY.appearance, mode); appSeg.reflect(mode); }
		function setAccent(val) { applyTheme(val, isGlobal()); lsSet(KEY.accent, val || null); reflectAccent(val); }
		function setGlobal(on) { lsSet(KEY.themeGlobal, on ? "1" : "0"); applyTheme(lsGet(KEY.accent, ""), on); }
		function setWallpaper(val) { applyWallpaper(val); lsSet(KEY.wallpaper, val || null); reflectWallpaper(WALLPAPERS.some(function (w) { return w.value === val; }) ? val : ""); }
		function setBlur(px, label) { applyBlur(px); lsSet(KEY.blur, String(px)); if (label) label.textContent = px + "px"; }
		function setDim(v, label) { var f = (v / 100).toFixed(2); applyDim(f); lsSet(KEY.dim, f); if (label) label.textContent = v + "%"; }
		function setWidth(v) { applyWidth(v); lsSet(KEY.width, v); widthSeg.reflect(v); }
		function setWpFit(k) { applyWpFit(k); lsSet(KEY.wpfit, k); fitSeg.reflect(k); }

		function resetAll() {
			for (var k in KEY) lsSet(KEY[k], null);
			applyTheme("", false); applyWallpaper("");
			root.style.removeProperty("--ob-wallpaper-blur");
			root.style.removeProperty("--ob-wallpaper-dim");
			applyWidth(DEFAULT_WIDTH);
			applyWpFit("");
			applyToggle("data-reduce-transparency", false);
			applyToggle("data-reduce-motion", false);
			applyAppearance("auto");
			uploadHint.textContent = "";
			hydrate();
		}

		/* ---- open / close ---- */
		function open() { panel.classList.add("ob-open"); scrim.classList.add("ob-open"); fab.setAttribute("aria-expanded", "true"); }
		function close() { panel.classList.remove("ob-open"); scrim.classList.remove("ob-open"); fab.setAttribute("aria-expanded", "false"); }
		fab.addEventListener("click", function () { panel.classList.contains("ob-open") ? close() : open(); });
		closeBtn.addEventListener("click", close);
		scrim.addEventListener("click", close);
		document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("ob-open")) close(); });

		/* ---- hydrate UI from stored state ---- */
		function hydrate() {
			appSeg.reflect(lsGet(KEY.appearance, "auto"));
			reflectAccent(lsGet(KEY.accent, ""));
			var wp = lsGet(KEY.wallpaper, ""); reflectWallpaper(WALLPAPERS.some(function (w) { return w.value === wp; }) ? wp : "");
			var blur = parseInt(lsGet(KEY.blur, "0"), 10) || 0; blurRange.value = blur; blurVal.textContent = blur + "px";
			var dim = Math.round((parseFloat(lsGet(KEY.dim, "0")) || 0) * 100); dimRange.value = dim; dimVal.textContent = dim + "%";
			widthSeg.reflect(lsGet(KEY.width, DEFAULT_WIDTH));
			fitSeg.reflect(lsGet(KEY.wpfit, DEFAULT_FIT));
			globalSw.set(lsGet(KEY.themeGlobal, "1") === "1");
			rt.set(lsGet(KEY.reduceTransparency, "0") === "1");
			rm.set(lsGet(KEY.reduceMotion, "0") === "1");
		}
		hydrate();
	}

	/* small iOS switch builder */
	function switchRow(label, onChange) {
		var input = el("input", { type: "checkbox" });
		var track = el("span", { "class": "ob-switch-track" });
		var sw = el("label", { "class": "ob-switch" }, [input, track]);
		input.addEventListener("change", function () { onChange(input.checked); });
		var row = el("div", { "class": "ob-switch-row" }, [el("span", { text: label }), sw]);
		return { row: row, set: function (on) { input.checked = !!on; } };
	}

	/* ---- navigation dropdowns: hover opens (CSS), click/tap pins (touch) - */
	function closeAllDropdowns(except) {
		var open = document.querySelectorAll("header .nav li.dropdown.ob-open");
		for (var i = 0; i < open.length; i++) if (open[i] !== except) open[i].classList.remove("ob-open");
	}
	function setupDropdowns() {
		if (window.__obsidianDropdowns) return;
		window.__obsidianDropdowns = true;

		document.addEventListener("click", function (e) {
			var t = e.target;
			if (!t || !t.closest) return;
			var toggle = t.closest("header .nav li.dropdown > a");
			if (toggle) {
				var li = toggle.parentNode;
				if (li.getElementsByClassName("dropdown-menu").length) {
					e.preventDefault();
					var willOpen = !li.classList.contains("ob-open");
					closeAllDropdowns(willOpen ? li : null);
					li.classList.toggle("ob-open", willOpen);
					return;
				}
			}
			if (t.closest("header .nav .dropdown-menu a")) { closeAllDropdowns(); return; }
			if (!t.closest("header .nav li.dropdown.ob-open")) closeAllDropdowns();
		});
		document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAllDropdowns(); });
	}

	function init() { build(); setupDropdowns(); }

	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", init);
	else
		init();
})();
