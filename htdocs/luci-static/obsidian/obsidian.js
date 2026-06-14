/*!
 * Obsidian Control Center
 * Personalization engine for the Obsidian LuCI theme:
 * appearance (auto/light/dark), accent colour, wallpaper, blur & dim.
 * Plain vanilla JS — no LuCI dependencies, so it also runs in the preview.
 * Licensed under the Apache License 2.0.
 */
(function () {
	"use strict";

	if (window.__obsidianControlCenter) return;
	window.__obsidianControlCenter = true;

	var root = document.documentElement;

	/* ---- persistence helpers -------------------------------------------- */
	var KEY = {
		appearance: "obsidian.appearance",
		accent: "obsidian.accent",
		wallpaper: "obsidian.wallpaper",
		blur: "obsidian.blur",
		dim: "obsidian.dim",
		reduceTransparency: "obsidian.reduceTransparency",
		reduceMotion: "obsidian.reduceMotion"
	};
	function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
	function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

	/* ---- presets -------------------------------------------------------- */
	var ACCENTS = [
		{ id: "auto",     name: "默认", color: "#007aff", value: "" },
		{ id: "purple",   name: "紫",   color: "#5e5ce6", value: "#5e5ce6" },
		{ id: "magenta",  name: "品红", color: "#bf5af2", value: "#bf5af2" },
		{ id: "pink",     name: "粉",   color: "#ff375f", value: "#ff375f" },
		{ id: "red",      name: "红",   color: "#ff3b30", value: "#ff3b30" },
		{ id: "orange",   name: "橙",   color: "#ff9500", value: "#ff9500" },
		{ id: "yellow",   name: "黄",   color: "#ffcc00", value: "#ffb300" },
		{ id: "green",    name: "绿",   color: "#34c759", value: "#34c759" },
		{ id: "teal",     name: "青",   color: "#30d3ee", value: "#30c0d8" },
		{ id: "graphite", name: "石墨", color: "#8e8e93", value: "#8e8e93" }
	];

	var WALLPAPERS = [
		{ id: "auto", name: "自动", value: "",
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
		{ id: "rose", name: "玫瑰",
		  value: "radial-gradient(at 80% 20%,#ffd0e0 0,transparent 55%),linear-gradient(160deg,#e96fb0,#b06ab3 60%,#5b6fd6)" },
		{ id: "forest", name: "森林",
		  value: "linear-gradient(160deg,#0f3d2e 0,#2e7d5b 55%,#7fc8a0 100%)" },
		{ id: "graphite", name: "石墨",
		  value: "linear-gradient(160deg,#3a3a3f,#1c1c20)" }
	];

	var mq = window.matchMedia("(prefers-color-scheme: dark)");

	/* ---- apply state to the DOM ----------------------------------------- */
	function applyAppearance(mode) {
		var dark = mode === "dark" ? true : mode === "light" ? false : mq.matches;
		root.setAttribute("data-darkmode", dark ? "true" : "false");
		root.setAttribute("data-appearance", mode);
	}
	function onSystemChange() { if ((lsGet(KEY.appearance, "auto")) === "auto") applyAppearance("auto"); }
	try { mq.addEventListener("change", onSystemChange); } catch (e) { try { mq.addListener(onSystemChange); } catch (e2) {} }

	function applyAccent(v) { if (v) root.style.setProperty("--ob-accent", v); else root.style.removeProperty("--ob-accent"); }
	function applyWallpaper(v) { if (v) root.style.setProperty("--ob-wallpaper", v); else root.style.removeProperty("--ob-wallpaper"); }
	function applyBlur(px) { root.style.setProperty("--ob-wallpaper-blur", (px || 0) + "px"); }
	function applyDim(v) { root.style.setProperty("--ob-wallpaper-dim", v || 0); }
	function applyToggle(attr, on) { if (on) root.setAttribute(attr, ""); else root.removeAttribute(attr); }

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

	/* ---- build the Control Center --------------------------------------- */
	function build() {
		if (document.getElementById("ob-fab")) return;

		var fab = el("button", { id: "ob-fab", type: "button", "aria-label": "个性化", title: "个性化", "aria-expanded": "false", html: ICON_FAB });
		var scrim = el("div", { id: "ob-scrim" });
		var panel = el("div", { id: "ob-panel", role: "dialog", "aria-label": "个性化", "aria-modal": "true" });

		/* header */
		var closeBtn = el("button", { "class": "ob-panel-close", "aria-label": "关闭", html: "&times;" });
		panel.appendChild(el("div", { "class": "ob-panel-head" }, [
			el("div", { "class": "ob-panel-title", text: "个性化" }),
			closeBtn
		]));

		var body = el("div", { "class": "ob-panel-body" });
		panel.appendChild(body);

		/* --- Appearance --- */
		var seg = el("div", { "class": "ob-seg", role: "group", "aria-label": "外观" });
		var segBtns = {};
		[["auto", "自动"], ["light", "浅色"], ["dark", "深色"]].forEach(function (m) {
			var b = el("button", { type: "button", "data-mode": m[0], text: m[1], "aria-pressed": "false" });
			b.addEventListener("click", function () { setAppearance(m[0]); });
			segBtns[m[0]] = b;
			seg.appendChild(b);
		});
		body.appendChild(group("外观", [seg]));

		/* --- Accent --- */
		var swatches = el("div", { "class": "ob-swatches" });
		var swatchEls = {};
		ACCENTS.forEach(function (a) {
			var s = el("button", { type: "button", "class": "ob-swatch", title: a.name, "aria-pressed": "false",
				style: "background:" + a.color + ";color:" + a.color });
			s.addEventListener("click", function () { setAccent(a.value); });
			swatchEls[a.value || "auto"] = s;
			swatches.appendChild(s);
		});
		/* custom colour picker */
		var colorInput = el("input", { type: "color", value: "#007aff", "aria-label": "自定义强调色" });
		var custom = el("button", { type: "button", "class": "ob-swatch ob-swatch-custom", title: "自定义", html: "+" }, [colorInput]);
		colorInput.addEventListener("input", function () { setAccent(colorInput.value); });
		custom.addEventListener("click", function (e) { if (e.target === custom) colorInput.click(); });
		swatches.appendChild(custom);
		body.appendChild(group("强调色", [swatches]));

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
			if (!f) return;
			if (f.size > 4.2 * 1024 * 1024) { uploadHint.textContent = "图片过大（请小于 4MB，浏览器存储所限）。"; return; }
			var r = new FileReader();
			r.onload = function () {
				try { setWallpaper('url("' + r.result + '")'); uploadHint.textContent = "已设置自定义壁纸。"; }
				catch (e) { uploadHint.textContent = "无法保存该图片（可能超出存储限制）。"; }
			};
			r.readAsDataURL(f);
		});
		body.appendChild(group("壁纸", [
			grid,
			el("div", { "class": "ob-wp-actions" }, [urlField, urlBtn]),
			el("div", { "class": "ob-wp-actions" }, [uploadBtn, fileInput]),
			uploadHint
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

		/* --- Accessibility toggles --- */
		var rt = switchRow("减少透明度", function (on) {
			applyToggle("data-reduce-transparency", on); lsSet(KEY.reduceTransparency, on ? "1" : "0");
		});
		var rm = switchRow("减少动效", function (on) {
			applyToggle("data-reduce-motion", on); lsSet(KEY.reduceMotion, on ? "1" : "0");
		});
		body.appendChild(group("辅助功能", [rt.row, rm.row]));

		/* --- Reset --- */
		var resetBtn = el("button", { type: "button", "class": "ob-btn", text: "恢复默认" });
		resetBtn.addEventListener("click", resetAll);
		body.appendChild(el("div", { "class": "ob-panel-foot" }, [resetBtn]));

		document.body.appendChild(fab);
		document.body.appendChild(scrim);
		document.body.appendChild(panel);

		/* ---- state setters (apply + persist + reflect UI) ---- */
		function reflectSeg(mode) { for (var k in segBtns) segBtns[k].setAttribute("aria-pressed", k === mode ? "true" : "false"); }
		function reflectAccent(val) {
			for (var k in swatchEls) swatchEls[k].setAttribute("aria-pressed", "false");
			var key = val || "auto";
			if (swatchEls[key]) swatchEls[key].setAttribute("aria-pressed", "true");
			if (val) { colorInput.value = toHex(val); }
		}
		function reflectWallpaper(val) {
			for (var k in wpEls) wpEls[k].setAttribute("aria-pressed", "false");
			var key = val || "auto";
			if (wpEls[key]) wpEls[key].setAttribute("aria-pressed", "true");
		}

		function setAppearance(mode) { applyAppearance(mode); lsSet(KEY.appearance, mode); reflectSeg(mode); }
		function setAccent(val) { applyAccent(val); lsSet(KEY.accent, val || null); reflectAccent(val); }
		function setWallpaper(val) { applyWallpaper(val); lsSet(KEY.wallpaper, val || null); reflectWallpaper(WALLPAPERS.some(function (w) { return w.value === val; }) ? val : ""); }
		function setBlur(px, label) { applyBlur(px); lsSet(KEY.blur, String(px)); if (label) label.textContent = px + "px"; }
		function setDim(v, label) { var f = (v / 100).toFixed(2); applyDim(f); lsSet(KEY.dim, f); if (label) label.textContent = v + "%"; }

		function resetAll() {
			[KEY.appearance, KEY.accent, KEY.wallpaper, KEY.blur, KEY.dim, KEY.reduceTransparency, KEY.reduceMotion]
				.forEach(function (k) { lsSet(k, null); });
			applyAccent(""); applyWallpaper("");
			root.style.removeProperty("--ob-wallpaper-blur");
			root.style.removeProperty("--ob-wallpaper-dim");
			applyToggle("data-reduce-transparency", false);
			applyToggle("data-reduce-motion", false);
			applyAppearance("auto");
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
			var mode = lsGet(KEY.appearance, "auto"); reflectSeg(mode);
			var accent = lsGet(KEY.accent, ""); reflectAccent(accent);
			var wp = lsGet(KEY.wallpaper, ""); reflectWallpaper(WALLPAPERS.some(function (w) { return w.value === wp; }) ? wp : "");
			var blur = parseInt(lsGet(KEY.blur, "0"), 10) || 0; blurRange.value = blur; blurVal.textContent = blur + "px";
			var dim = Math.round((parseFloat(lsGet(KEY.dim, "0")) || 0) * 100); dimRange.value = dim; dimVal.textContent = dim + "%";
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

	/* normalize any css colour-ish string to #rrggbb for the picker (best effort) */
	function toHex(v) {
		v = (v || "").trim();
		if (/^#([0-9a-f]{6})$/i.test(v)) return v;
		if (/^#([0-9a-f]{3})$/i.test(v)) return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
		return "#007aff";
	}

	/* ---- navigation dropdowns: click / tap to toggle -------------------- */
	function closeAllDropdowns(except) {
		var open = document.querySelectorAll("header .nav li.dropdown.ob-open");
		for (var i = 0; i < open.length; i++) if (open[i] !== except) open[i].classList.remove("ob-open");
	}
	function setupDropdowns() {
		if (window.__obsidianDropdowns) return;
		window.__obsidianDropdowns = true;

		/* Delegated so it also works for menus injected later by menu-obsidian.js */
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
			/* tapping an item inside a menu closes it (then the link navigates) */
			if (t.closest("header .nav .dropdown-menu a")) { closeAllDropdowns(); return; }
			/* click anywhere outside an open dropdown closes it */
			if (!t.closest("header .nav li.dropdown.ob-open")) closeAllDropdowns();
		});
		document.addEventListener("keydown", function (e) {
			if (e.key === "Escape") closeAllDropdowns();
		});
	}

	function init() { build(); setupDropdowns(); }

	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", init);
	else
		init();
})();
