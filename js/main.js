/* ==========================================================================
   Tokenisation over Bounded Alphabets is Hard: interactive figures
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     KaTeX: macros mirroring the paper's colour-coded notation
     (blue = characters, magenta = subwords/merges, orange = functions)
     ------------------------------------------------------------------- */
  const MACROS = {
    "\\cc": "\\textcolor{547FEF}{#1}",
    "\\tk": "\\textcolor{DC267F}{#1}",
    "\\fn": "\\textcolor{FE6100}{#1}",
    "\\tok": "\\fn{\\mathtt{tok}}",
    "\\tokd": "\\fn{\\mathtt{tok}_{\\text{☞}}}",
    "\\toku": "\\fn{\\mathtt{tok}_{\\uparrow}}",
    "\\Sig": "\\cc{\\Sigma}",
    "\\chars": "\\cc{\\mathbf{c}}",
    "\\subs": "\\tk{\\mathbf{s}}",
    "\\Voc": "\\tk{\\mathcal{S}}",
    "\\merges": "\\tk{\\mathbf{m}}",
    "\\D": "\\mathcal{D}",
    "\\G": "\\fn{\\mathfrak{G}}",
    "\\xT": "\\cc{\\mathbf{x}^{\\mathtt{T}}_{#1}}",
    "\\xF": "\\cc{\\mathbf{x}^{\\mathtt{F}}_{#1}}",
    "\\txT": "\\tk{\\mathbf{x}^{\\mathtt{T}}_{#1}}",
    "\\txF": "\\tk{\\mathbf{x}^{\\mathtt{F}}_{#1}}",
    "\\NP": "\\mathsf{NP}",
    "\\Ptime": "\\mathsf{P}",
    "\\enc": "\\fn{\\mathtt{enc}}",
    "\\defeq": "\\stackrel{\\texttt{\\tiny def}}{=}",
    "\\argmin": "\\operatorname*{arg\\,min}"
  };
  const hasKatex = typeof window.katex !== "undefined";
  function T(src, display) {
    if (!hasKatex) return src;
    return katex.renderToString(src, { macros: MACROS, throwOnError: false, displayMode: !!display, strict: false });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const $ = id => document.getElementById(id);

  if (hasKatex && typeof window.renderMathInElement === "function") {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false }
      ],
      macros: MACROS,
      throwOnError: false,
      strict: false
    });
  }

  /* ---------------------------------------------------------------------
     Small UI bits: title split, background bits, reveal, nav, lightbox
     ------------------------------------------------------------------- */
  const split = $("splitToggle");
  if (split) split.addEventListener("change", () => $("titleTokens").classList.toggle("split", split.checked));

  (function bits() {
    const el = $("bitsBg");
    if (!el) return;
    let out = "";
    for (let r = 0; r < 34; r++) {
      let line = "";
      for (let c = 0; c < 140; c++) line += Math.random() < 0.5 ? "0" : "1";
      out += line + "\n";
    }
    el.textContent = out;
  })();

  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

  const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const secs = navLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  function onScroll() {
    let cur = null;
    secs.forEach(s => { if (s.getBoundingClientRect().top < 120) cur = s.id; });
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + cur));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const lb = $("lightbox"), thumb = $("posterThumb");
  if (lb && thumb) {
    const open = () => lb.classList.add("open");
    thumb.addEventListener("click", open);
    thumb.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    lb.addEventListener("click", () => lb.classList.remove("open"));
    document.addEventListener("keydown", e => { if (e.key === "Escape") lb.classList.remove("open"); });
  }

  const copyBtn = $("copyBib");
  if (copyBtn) copyBtn.addEventListener("click", () => {
    const txt = $("bibtex").innerText;
    const done = () => { copyBtn.textContent = "Copied!"; setTimeout(() => (copyBtn.textContent = "Copy"), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => {});
    else {
      const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta);
      ta.select(); try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ } ta.remove();
    }
  });

  /* ---------------------------------------------------------------------
     Shared helpers
     ------------------------------------------------------------------- */
  function pretokenise(text) {
    return text.trim().split(/\s+/).filter(Boolean).map((w, i) => (i === 0 ? w : "_" + w));
  }
  function chip(tok, opts) {
    opts = opts || {};
    const cls = ["chip"];
    if (opts.char) cls.push("char");
    if (opts.isNew) cls.push("new");
    if (opts.extra) cls.push(opts.extra);
    const lab = opts.label ? `<span class="lab">${opts.label}</span>` : "";
    return `<span class="${cls.join(" ")}">${esc(tok)}${lab}</span>`;
  }
  function seqHtml(tokens, opts) {
    opts = opts || {};
    return `<span class="tokseq"><span class="angle">⟨</span>${tokens.map((t, i) =>
      chip(t, { char: opts.charSet ? opts.charSet.has(t) : t.length === 1, isNew: opts.newIdx && opts.newIdx.has(i), label: opts.labelFn ? opts.labelFn(t) : "" })
    ).join("")}<span class="angle">⟩</span></span>`;
  }

  /* direct tokenisation: shortest path over vocabulary matches */
  function directTok(str, vocab) {
    const n = str.length, dist = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(null);
    dist[0] = 0;
    const toks = Array.from(vocab);
    for (let i = 0; i < n; i++) {
      if (dist[i] === Infinity) continue;
      for (const t of toks) {
        if (t.length && str.startsWith(t, i) && dist[i] + 1 < dist[i + t.length]) {
          dist[i + t.length] = dist[i] + 1; prev[i + t.length] = [i, t];
        }
      }
    }
    if (dist[n] === Infinity) return null;
    const out = []; let k = n;
    while (k > 0) { const [i, t] = prev[k]; out.unshift(t); k = i; }
    return out;
  }

  /* ---------------------------------------------------------------------
     Demo 1: bottom-up tokenisation (merge sequences, BPE)
     ------------------------------------------------------------------- */
  function applyMerge(seq, a, b) {
    const out = [], newIdx = new Set();
    let i = 0;
    while (i < seq.length) {
      if (i + 1 < seq.length && seq[i] === a && seq[i + 1] === b) { newIdx.add(out.length); out.push(a + b); i += 2; }
      else { out.push(seq[i]); i += 1; }
    }
    return { out, newIdx };
  }
  function parseMerges(s) {
    return s.split(",").map(x => x.replace(/[∘⊚◦+]/g, " ").trim()).filter(Boolean)
      .map(x => x.split(/\s+/)).filter(p => p.length === 2);
  }
  function learnBPE(words, K) {
    let seqs = words.map(w => Array.from(w));
    const merges = [];
    for (let k = 0; k < K; k++) {
      const counts = new Map();
      seqs.forEach(s => { for (let i = 0; i + 1 < s.length; i++) { const key = s[i] + "\u0000" + s[i + 1]; counts.set(key, (counts.get(key) || 0) + 1); } });
      let best = null, bc = 0;
      counts.forEach((c, key) => { if (c > bc) { bc = c; best = key; } });
      if (!best) break;
      const [a, b] = best.split("\u0000");
      merges.push([a, b]);
      seqs = seqs.map(s => applyMerge(s, a, b).out);
    }
    return merges;
  }
  function renderBPE() {
    const words = pretokenise($("bpeText").value);
    const merges = parseMerges($("bpeMerges").value);
    const alphabet = new Set(words.join(""));
    let seqs = words.map(w => Array.from(w));
    const total = s => s.reduce((a, x) => a + x.length, 0);
    let rows = `<tr><td>Pretok.</td><td>${words.map(w => `<span class="pre bits" style="min-width:${Math.max(w.length, 3)}ch">${esc(w)}</span>`).join("")}</td><td class="count"></td></tr>`;
    rows += `<tr style="animation:fadeRow .4s ease both"><td>Chars</td><td>${seqs.map(s => `<span class="pre">${seqHtml(s, { charSet: alphabet })}</span>`).join("")}</td><td class="count">${total(seqs)} symbols</td></tr>`;
    const created = [];
    merges.forEach(([a, b], k) => {
      const res = seqs.map(s => applyMerge(s, a, b));
      seqs = res.map(r => r.out);
      created.push(a + b);
      const lbl = T(`\\tk{\\mathtt{${texSafe(a)}}} + \\tk{\\mathtt{${texSafe(b)}}}`);
      rows += `<tr style="animation:fadeRow .4s ease both;animation-delay:${(k + 1) * 110}ms"><td class="step-lbl">${lbl}</td><td>${res.map(r =>
        `<span class="pre">${seqHtml(r.out, { charSet: alphabet, newIdx: r.newIdx })}</span>`).join("")}</td><td class="count">${total(seqs)} symbols</td></tr>`;
    });
    $("bpeSteps").innerHTML = rows;
    const nChars = words.reduce((a, w) => a + w.length, 0);
    $("bpeOut").innerHTML =
      `<span class="k">Output vocabulary</span><span class="tokseq">${Array.from(alphabet).sort().map(c => chip(c, { char: true })).join("")}${created.map(t => chip(t)).join("")}</span>` +
      `<span class="k" style="margin-left:auto">${T("\\G_\\ell")} = ${total(seqs)} <span class="hint">(from ${nChars} characters)</span></span>`;
  }
  function texSafe(s) {
    return s.replace(/\\/g, "\\backslash ").replace(/([#$%&{}^_~])/g, "\\$1");
  }
  if ($("bpeDemo")) {
    // dragging K re-learns BPE merges live; typing merges switches to manual mode
    let bpeAuto = false;
    const relearn = () => {
      $("bpeKv").textContent = $("bpeK").value;
      const m = learnBPE(pretokenise($("bpeText").value), +$("bpeK").value);
      $("bpeMerges").value = m.map(p => p.join(" ")).join(", ");
      renderBPE();
    };
    $("bpeK").addEventListener("input", () => { bpeAuto = true; relearn(); });
    $("bpeText").addEventListener("input", () => (bpeAuto ? relearn() : renderBPE()));
    $("bpeMerges").addEventListener("input", () => { bpeAuto = false; renderBPE(); });
    renderBPE();
  }

  /* ---------------------------------------------------------------------
     Demo 2: direct tokenisation as shortest path in a lattice
     ------------------------------------------------------------------- */
  const dir = { vocab: new Set(["he", "re", "the"]), auto: false, cache: new Map() };

  // every substring of length >= 2 inside a pretoken, ranked by how many symbols it could save
  function candidates(words) {
    const cnt = new Map();
    words.forEach(w => {
      for (let i = 0; i < w.length; i++) for (let j = i + 2; j <= w.length; j++) {
        const t = w.slice(i, j); cnt.set(t, (cnt.get(t) || 0) + 1);
      }
    });
    return Array.from(cnt, ([t, c]) => ({ t, c }))
      .sort((a, b) => b.c * (b.t.length - 1) - a.c * (a.t.length - 1) || b.t.length - a.t.length || (a.t < b.t ? -1 : 1))
      .slice(0, 30);
  }
  const totalLen = (words, vocab) => words.reduce((a, w) => a + (directTok(w, vocab) || Array.from(w)).length, 0);
  function choose(n, k) { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return Math.round(r); }

  // optimal vocabulary of size K: exhaustive search when small enough, greedy otherwise
  function bestVocab(words, cands, K) {
    const key = words.join(" ") + "|" + K;
    if (dir.cache.has(key)) return dir.cache.get(key);
    const alphabet = Array.from(new Set(words.join("")));
    const k = Math.min(K, cands.length), space = choose(cands.length, k);
    let res;
    if (space <= 60000) {
      let best = Infinity, arg = [];
      const pick = [];
      const rec = start => {
        if (pick.length === k) {
          const v = totalLen(words, new Set([...alphabet, ...pick]));
          if (v < best) { best = v; arg = pick.slice(); }
          return;
        }
        for (let i = start; i <= cands.length - (k - pick.length); i++) { pick.push(cands[i].t); rec(i + 1); pick.pop(); }
      };
      rec(0);
      res = { vocab: arg, len: best, exact: true, space };
    } else {
      const pickSet = new Set(alphabet), picked = [];
      for (let r = 0; r < k; r++) {
        let bt = null, bv = Infinity;
        cands.forEach(c => {
          if (pickSet.has(c.t)) return;
          pickSet.add(c.t); const v = totalLen(words, pickSet); pickSet.delete(c.t);
          if (v < bv) { bv = v; bt = c.t; }
        });
        pickSet.add(bt); picked.push(bt);
      }
      res = { vocab: picked, len: totalLen(words, pickSet), exact: false, space };
    }
    dir.cache.set(key, res);
    return res;
  }
  function bpeLen(words, K) {
    let seqs = words.map(w => Array.from(w));
    learnBPE(words, K).forEach(([a, b]) => { seqs = seqs.map(s => applyMerge(s, a, b).out); });
    return seqs.reduce((a, s) => a + s.length, 0);
  }

  function renderDirect() {
    const words = pretokenise($("dirText").value);
    const alphabet = new Set(words.join(""));
    const K = +$("dirK").value;
    $("dirKv").textContent = K;
    const cands = candidates(words);
    const candSet = new Set(cands.map(c => c.t));
    dir.vocab.forEach(t => { if (!candSet.has(t)) dir.vocab.delete(t); });
    if (dir.auto) dir.vocab = new Set(bestVocab(words, cands, K).vocab);
    const vocab = new Set([...alphabet, ...dir.vocab]);

    const R = 12, WGAP = 34, Y = 92, PAD = 20;
    const nNodes = words.reduce((a, w) => a + w.length + 1, 0);
    const avail = ($("dirLattice").clientWidth || 900) - 2 * PAD - Math.max(0, words.length - 1) * WGAP;
    const GAP = Math.max(38, Math.min(62, avail / Math.max(1, nNodes - words.length + (words.length - 1) * 0.5)));
    let x = PAD, nodeId = 0, maxUp = 0, maxDown = 0;
    const tokenised = [], parts = [], used = new Set();
    words.forEach(w => {
      const best = directTok(w, vocab) || Array.from(w);
      tokenised.push(best);
      best.forEach(t => used.add(t));
      const onEdges = new Set(); let p = 0;
      best.forEach(t => { onEdges.add(p + ":" + t); p += t.length; });
      const xs = []; for (let i = 0; i <= w.length; i++) xs.push(x + i * GAP);
      const edges = [];
      for (let i = 0; i < w.length; i++) vocab.forEach(t => { if (w.startsWith(t, i)) edges.push({ i, t }); });
      edges.sort((a, b) => a.t.length - b.t.length || a.i - b.i);
      // place arcs above or below the line so overlapping spans avoid each other
      const sides = { up: [], down: [] };
      const overlaps = (list, a, b) => list.filter(([s, t]) => s < b && a < t).length;
      edges.forEach(e => {
        const on = onEdges.has(e.i + ":" + e.t);
        const x1 = xs[e.i], x2 = xs[e.i + e.t.length];
        const mk = on ? "url(#arrOn)" : "url(#arrOff)";
        if (e.t.length === 1) {
          parts.push(`<g class="edge char${on ? " on" : ""}"><path d="M${x1 + R} ${Y} L${x2 - R - 2} ${Y}" marker-end="${mk}"/><text x="${(x1 + x2) / 2}" y="${Y - 8}">${esc(e.t)}</text></g>`);
        } else {
          const a = e.i, b = e.i + e.t.length;
          const ou = overlaps(sides.up, a, b), od = overlaps(sides.down, a, b);
          const up = ou <= od;
          const level = up ? ou : od;
          (up ? sides.up : sides.down).push([a, b]);
          const h = 22 + 14 * e.t.length + 18 * level;
          const yc = up ? Y - h : Y + h;
          const ya = up ? Y - R + 1 : Y + R - 1;
          const ly = up ? Y - h / 2 - 6 : Y + h / 2 + 14;
          if (up) maxUp = Math.max(maxUp, h); else maxDown = Math.max(maxDown, h);
          parts.push(`<g class="edge arc${on ? " on" : ""}" data-t="${esc(e.t)}"><title>tap to remove “${esc(e.t)}”</title><path class="hit" d="M${x1 + 4} ${ya} Q ${(x1 + x2) / 2} ${yc} ${x2 - 6} ${ya + (up ? -2 : 2)}"/><path d="M${x1 + 4} ${ya} Q ${(x1 + x2) / 2} ${yc} ${x2 - 6} ${ya + (up ? -2 : 2)}" marker-end="${mk}"/><text x="${(x1 + x2) / 2}" y="${ly}">${esc(e.t)}</text></g>`);
        }
      });
      xs.forEach(nx => { parts.push(`<g class="node"><circle cx="${nx}" cy="${Y}" r="${R}"/><text x="${nx}" y="${Y}">${nodeId++}</text></g>`); });
      x = xs[xs.length - 1] + WGAP + GAP / 2;
    });
    const width = x - WGAP - GAP / 2 + PAD;
    const top = Math.min(Y - maxUp / 2 - 30, 40), height = Y + maxDown / 2 + 40;
    $("dirLattice").innerHTML = `<svg width="${width}" height="${height - top + 10}" viewBox="0 ${top} ${width} ${height - top + 10}" role="img" aria-label="Tokenisation lattice">
      <defs>
        <marker id="arrOff" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#CBC6DC"/></marker>
        <marker id="arrOn" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#DC267F"/></marker>
      </defs>${parts.join("")}</svg>`;
    $("dirLattice").querySelectorAll(".edge.arc").forEach(g => g.addEventListener("click", () => toggleTok(g.dataset.t)));

    // candidate chips
    $("dirCands").innerHTML = cands.map(c => {
      const on = dir.vocab.has(c.t), idle = on && !used.has(c.t);
      return `<button class="cand${on ? " on" : ""}${idle ? " idle" : ""}" data-t="${esc(c.t)}" title="${idle ? "in the vocabulary but not used by the optimal segmentation" : "appears " + c.c + "×"}">${esc(c.t)}<span class="cc">${c.c}×</span></button>`;
    }).join("");
    $("dirCands").querySelectorAll(".cand").forEach(b => b.addEventListener("click", () => toggleTok(b.dataset.t)));
    $("dirCount").textContent = `${dir.vocab.size} chosen${dir.auto ? " (best for K = " + K + ")" : ""}`;

    const nChars = words.reduce((a, w) => a + w.length, 0);
    const nTok = tokenised.reduce((a, s) => a + s.length, 0);
    $("dirOut").innerHTML = `<span class="k">Output</span>${tokenised.map(s => seqHtml(s, { charSet: alphabet })).join(" ")}` +
      `<span class="k" style="margin-left:auto">${T("\\G_\\ell")} = ${nTok} <span class="hint">(from ${nChars} characters)</span></span>`;

    // comparison: your vocabulary vs. the optimum of size K vs. BPE with K merges
    const opt = bestVocab(words, cands, K), bpe = bpeLen(words, K);
    const card = (cls, title, val, sub) => `<div class="cmp ${cls}"><div class="cmp-t">${title}</div><div class="cmp-v">${val}</div><div class="cmp-s">${sub}</div></div>`;
    $("dirCompare").innerHTML =
      card("you", `Your vocabulary`, nTok, `${dir.vocab.size} token${dir.vocab.size === 1 ? "" : "s"}${dir.vocab.size > K ? " (more than K)" : ""}`) +
      card("opt", `Best with K = ${K}`, opt.len, opt.exact
        ? `searched all ${opt.space.toLocaleString("en")} vocabularies`
        : `greedy: ${opt.space.toLocaleString("en")} vocabularies is too many to try`) +
      card("bpe", `BPE, K = ${K} merges`, bpe, bpe > opt.len ? `${bpe - opt.len} symbol${bpe - opt.len > 1 ? "s" : ""} worse than optimal` : "matches the optimum here");
  }
  function toggleTok(t) {
    dir.auto = false;
    dir.vocab.has(t) ? dir.vocab.delete(t) : dir.vocab.add(t);
    renderDirect();
  }
  if ($("directDemo")) {
    $("dirText").addEventListener("input", renderDirect);
    $("dirK").addEventListener("input", () => { dir.auto = true; renderDirect(); });
    window.addEventListener("resize", renderDirect);
    renderDirect();
  }

  /* ---------------------------------------------------------------------
     Demo 3: approximation ratio under G_l vs G_r
     ------------------------------------------------------------------- */
  function renderRatio() {
    let N = +$("rNin").value, O = +$("rOin").value, A = +$("rAin").value;
    $("rOin").max = N; $("rAin").max = N;
    if (O > N) O = N;
    if (A < O) { A = O; $("rAin").value = A; }
    if (A > N) { A = N; }
    $("rN").textContent = N; $("rO").textContent = O; $("rA").textContent = A;
    const bar = (lbl, v, col) => `<div class="meter"><div class="row"><span>${lbl}</span><b>${v}</b></div><div class="bar"><div class="fill" style="width:${(100 * v / N).toFixed(2)}%;background:${col}"></div></div></div>`;
    $("ratioBars").innerHTML = bar("raw characters", N, "var(--blue)") + bar("heuristic tokeniser", A, "var(--orange)") + bar("optimal tokeniser", O, "var(--magenta)");
    $("rL").textContent = (A / O).toFixed(3);
    $("rR").textContent = A === N ? "∞" : ((N - O) / (N - A)).toFixed(3);
  }
  if ($("ratioDemo")) {
    ["rNin", "rOin", "rAin"].forEach(id => $(id).addEventListener("input", renderRatio));
    renderRatio();
  }

  /* ---------------------------------------------------------------------
     Demo 4: 3-OCC-MAX2SAT  →  binary direct tokenisation (Reduction 1)
     ------------------------------------------------------------------- */
  const PRESETS = {
    // literals: +j means X_j, -j means ¬X_j
    poster: { J: 2, clauses: [[1, 2], [-1, 2], [1, -2], [-1, -2]] },
    occ3: { J: 4, clauses: [[1, 3], [-1, 3], [2, 4], [2, -4], [-2, -3], [1, -4]] }
  };
  const F1 = 63, F2 = 21, F3 = 7;
  const sat = { preset: "poster", J: 2, clauses: [], assign: [], vocab: [] };
  const zT = j => "0".repeat(2 * j - 1);
  const zF = j => "0".repeat(2 * j);
  const litStr = l => (l > 0 ? zT(l) : zF(-l));
  const litTex = l => (l > 0 ? `X_{${l}}` : `\\neg X_{${-l}}`);
  const litVal = (l, a) => (l > 0 ? a[l - 1] : !a[-l - 1]);
  const nSat = a => sat.clauses.filter(c => litVal(c[0], a) || litVal(c[1], a)).length;

  let satLabels = new Map();
  function buildLabels() {
    satLabels = new Map();
    for (let j = 1; j <= sat.J; j++) {
      const t = zT(j), f = zF(j);
      satLabels.set(t, `\\txT{${j}}`); satLabels.set(f, `\\txF{${j}}`);
      satLabels.set("1" + t, `\\tk{1}\\txT{${j}}`); satLabels.set(t + "1", `\\txT{${j}}\\tk{1}`);
      satLabels.set("1" + f, `\\tk{1}\\txF{${j}}`); satLabels.set(f + "1", `\\txF{${j}}\\tk{1}`);
      satLabels.set("1" + t + "1", `\\tk{1}\\txT{${j}}\\tk{1}`); satLabels.set("1" + f + "1", `\\tk{1}\\txF{${j}}\\tk{1}`);
    }
  }
  const tokLabel = t => (satLabels.has(t) ? T(satLabels.get(t)) : "");
  function compliantVocab() {
    const v = [];
    for (let j = 1; j <= sat.J; j++) v.push({ t: "1" + zT(j), k: "fix" }, { t: zT(j) + "1", k: "fix" }, { t: "1" + zF(j), k: "fix" }, { t: zF(j) + "1", k: "fix" });
    for (let j = 1; j <= sat.J; j++) v.push({ t: "1" + (sat.assign[j - 1] ? zT(j) : zF(j)) + "1", k: "dep" });
    return v;
  }
  function loadPreset(name) {
    const p = PRESETS[name];
    sat.preset = name; sat.J = p.J; sat.clauses = p.clauses;
    sat.assign = new Array(p.J).fill(false);
    buildLabels();
    sat.vocab = compliantVocab();
    renderSat();
  }
  function optimum() {
    let best = -1, arg = null;
    for (let m = 0; m < (1 << sat.J); m++) {
      const a = []; for (let j = 0; j < sat.J; j++) a.push(((m >> j) & 1) === 0);
      const s = nSat(a); if (s > best) { best = s; arg = a; }
    }
    return { best, arg };
  }
  function datasets() {
    const D1 = [], D2 = [], D3 = [], D4 = [];
    for (let j = 1; j <= sat.J; j++) {
      D1.push("1" + zT(j), zT(j) + "1", "1" + zF(j), zF(j) + "1");
      D2.push("1" + zT(j) + "1", "1" + zF(j) + "1");
      D3.push("1" + zT(j) + "1" + zF(j) + "1");
    }
    sat.clauses.forEach(c => D4.push("1" + litStr(c[0]) + "1" + litStr(c[1]) + "1"));
    return [
      { name: "\\D_1", mult: F1, role: T("\\text{forces } \\tk{1}\\txT{j},\\ \\txT{j}\\tk{1},\\ \\tk{1}\\txF{j},\\ \\txF{j}\\tk{1}"), items: D1, coef: 252 },
      { name: "\\D_2", mult: F2, role: "forces the remaining tokens to be 101-strings", items: D2, coef: 63 },
      { name: "\\D_3", mult: F3, role: T("\\text{exactly one of } \\tk{1}\\txT{j}\\tk{1} \\text{ or } \\tk{1}\\txF{j}\\tk{1} \\text{ per variable}"), items: D3, coef: 14 },
      { name: "\\D_4", mult: 1, role: "one string per clause", items: D4, clause: true }
    ];
  }
  function renderSat() {
    const J = sat.J, I = sat.clauses.length, K = 5 * J;
    // variable toggles
    $("satVars").innerHTML = sat.assign.map((v, j) =>
      `<button class="vt ${v ? "T" : "F"}" data-j="${j}">${T(`X_{${j + 1}}`)}<span class="val">${v ? "T" : "F"}</span></button>`).join("");
    $("satVars").querySelectorAll(".vt").forEach(b => b.addEventListener("click", () => flipVar(+b.dataset.j)));
    // clauses
    $("satClauses").innerHTML = sat.clauses.map((c, i) => {
      const ok = litVal(c[0], sat.assign) || litVal(c[1], sat.assign);
      return `<div class="clause${ok ? " sat" : ""}"><span>${T(`(${litTex(c[0])} \\lor ${litTex(c[1])})`)}</span><span class="st">${ok ? "satisfied" : "unsatisfied"}</span></div>`;
    }).join("");
    // vocabulary
    const vset = new Set(["0", "1", ...sat.vocab.map(v => v.t)]);
    const nExtra = sat.vocab.length;
    $("satBudget").innerHTML = `(${nExtra} / K = 5J = ${K} tokens)` + (nExtra > K ? ` <b class="no">(over budget)</b>` : "");
    $("satVocab").innerHTML = sat.vocab.map((v, i) =>
      `<span class="vchip">${chip(v.t, { label: tokLabel(v.t) || "custom", extra: v.k === "dep" ? "dep" : (v.k === "custom" ? "custom" : "") })}<span class="x" data-i="${i}" title="remove">×</span></span>`).join("");
    $("satVocab").querySelectorAll(".x").forEach(x => x.addEventListener("click", () => { sat.vocab.splice(+x.dataset.i, 1); renderSat(); }));
    // datasets
    let total = 0, html = "";
    datasets().forEach(d => {
      let sub = 0, body = "";
      d.items.forEach((s, idx) => {
        const tk = directTok(s, vset);
        sub += tk.length * d.mult;
        const bitsHtml = `<span class="bits">${s}</span>`;
        if (d.clause) {
          const c = sat.clauses[idx];
          const good = tk.length <= 2;
          body += `<div class="ds-item clause-str ${good ? "good" : "bad"}"><span class="cl-lbl">${T(`${litTex(c[0])} \\lor ${litTex(c[1])}`)}</span>${bitsHtml}<span class="arrow">→</span>${seqHtml(tk, { charSet: new Set(["0", "1"]), labelFn: tokLabel })}<span class="n">${tk.length} sym.</span></div>`;
        } else {
          body += `<div class="ds-item">${bitsHtml}<span class="arrow">→</span>${seqHtml(tk, { charSet: new Set(["0", "1"]), labelFn: tokLabel })}</div>`;
        }
      });
      total += sub;
      html += `<div class="subd"><div class="subd-head"><span class="nm">${T(d.name)}</span><span class="mult">×${d.mult}</span><span class="role">${d.role}</span><span class="len">${T(`\\G_\\ell = ${sub}`)}</span></div><div class="subd-body">${body}</div></div>`;
    });
    $("satData").innerHTML = html;
    // totals
    const g = nSat(sat.assign), opt = optimum().best;
    const formula = 329 * J + 3 * I - g, best = 329 * J + 3 * I - opt;
    const compliant = isCompliant();
    let verdict;
    if (nExtra > K) verdict = `<span class="pill-no">invalid</span><span class="no">uses ${nExtra} &gt; K = ${K} tokens</span>`;
    else if (total === best) verdict = `<span class="pill-ok">optimal</span><span class="ok">no tokeniser with K = ${K} compresses this dataset further</span>`;
    else verdict = `<span class="pill-no">+${total - best}</span><span>symbols above the optimum ${T(`329J + 3I - \\gamma_{\\texttt{opt}} = ${best}`)}</span>`;
    $("satTotal").innerHTML =
      `<div class="eq">${T(`\\G_\\ell(\\tokd[\\Voc], \\D) = ${total}`)}</div>` +
      (compliant ? `<div class="eq" style="margin-top:4px">${T(`= 329\\cdot ${J} + 3\\cdot ${I} - \\underbrace{${g}}_{\\text{sat. clauses}} = ${formula}`)}</div>` :
        `<div class="hint" style="margin-top:4px">This vocabulary is <b>not sat-compliant</b>, so the formula ${T("329J + 3I - \\gamma^\\star")} no longer applies.</div>`) +
      `<div class="verdict">${verdict}</div>` +
      `<div class="hint" style="margin-top:8px">Decision version: with ${T(`\\gamma = ${g}`)}, the target is ${T(`\\delta = ${formula}`)}; best achievable ${T(`\\gamma_{\\texttt{opt}} = ${opt}`)} of ${I} clauses.</div>`;
  }
  function isCompliant() {
    const ts = new Set(sat.vocab.map(v => v.t));
    if (sat.vocab.length !== 5 * sat.J) return false;
    for (let j = 1; j <= sat.J; j++) {
      const t = zT(j), f = zF(j);
      if (!["1" + t, t + "1", "1" + f, f + "1"].every(x => ts.has(x))) return false;
      if (ts.has("1" + t + "1") === ts.has("1" + f + "1")) return false;
      if (ts.has("1" + t + "1") !== sat.assign[j - 1]) return false;
    }
    return true;
  }
  function flipVar(j) {
    sat.assign[j] = !sat.assign[j];
    const t = "1" + zT(j + 1) + "1", f = "1" + zF(j + 1) + "1";
    const [from, to] = sat.assign[j] ? [f, t] : [t, f];
    const k = sat.vocab.findIndex(v => v.t === from);
    if (k >= 0 && !sat.vocab.some(v => v.t === to)) sat.vocab[k] = { t: to, k: "dep" };
    renderSat();
  }
  if ($("satDemo")) {
    $("satPreset").value = "occ3";
    $("satPreset").addEventListener("change", e => loadPreset(e.target.value));
    $("satOpt").addEventListener("click", () => { sat.assign = optimum().arg.slice(); sat.vocab = compliantVocab(); renderSat(); });
    $("satReset").addEventListener("click", () => { sat.vocab = compliantVocab(); renderSat(); });
    const add = () => {
      const v = $("satAdd").value.trim();
      if (!/^[01]{2,}$/.test(v) || sat.vocab.some(x => x.t === v)) { $("satAdd").style.borderColor = "var(--orange)"; return; }
      $("satAdd").style.borderColor = ""; $("satAdd").value = "";
      sat.vocab.push({ t: v, k: satLabels.has(v) ? "fix" : "custom" }); renderSat();
    };
    $("satAddBtn").addEventListener("click", add);
    $("satAdd").addEventListener("keydown", e => { if (e.key === "Enter") add(); });
    loadPreset("occ3");
  }

  /* ---------------------------------------------------------------------
     Bottom-up multiplicities (Reduction 2)
     ------------------------------------------------------------------- */
  if ($("buMults")) {
    const ms = [["\\D_1", 575, "var(--p-blue)"], ["\\D_2", 115, "var(--p-lav)"], ["\\D_3", 23, "var(--p-pink)"], ["\\D_4", 4, "#FFE2A8"], ["\\D_5", 1, "#F1EFF7"]];
    const max = Math.log(576);
    $("buMults").innerHTML = ms.map(([n, v, c]) =>
      `<div class="mb"><span class="v">×${v}</span><div class="b" style="height:${Math.max(6, 100 * Math.log(v + 1) / max)}%;background:${c}"></div><span class="l">${T(n)}</span></div>`).join("");
  }

  /* ---------------------------------------------------------------------
     Demo 5: vertex cover  →  unary direct tokenisation (Reduction 3)
     ------------------------------------------------------------------- */
  const VC = {
    J: 9,
    edges: [[4, 5], [5, 6], [5, 7], [5, 9], [3, 5], [6, 7], [6, 9], [7, 9], [7, 8], [8, 9], [1, 3], [2, 3], [1, 2]],
    pos: {
      1: [65, 435], 2: [228, 425], 3: [205, 285], 4: [60, 62], 5: [212, 168],
      6: [345, 82], 7: [455, 205], 8: [470, 372], 9: [335, 290]
    },
    // where to put the "+B" tag of a cover vertex, relative to the vertex
    tag: { 1: [-8, 38], 2: [10, 40], 3: [-62, -8], 4: [0, -34], 5: [-58, -24], 6: [44, -18], 7: [50, 0], 8: [44, 22], 9: [-10, 42] },
    cover: new Set(), manual: false
  };
  const vcN = BigInt(Math.pow(VC.J + VC.edges.length + 1, 4)); // (J+I+1)^4
  const vcB = vcN ** 4n;
  const encv = j => { const b = BigInt(j); return b + b * b * vcN + b * b * b * vcN * vcN; };
  function digitsOf(x) {
    const d = []; for (let k = 0; k < 5; k++) { d.unshift(x % vcN); x = x / vcN; } return d;
  }
  function vcTargets() {
    const rows = [];
    for (let j = 1; j <= VC.J; j++) rows.push({ grp: "vertex", v: encv(j), lab: `\\ell_{${j}}` });
    rows.push({ grp: "vertex", v: vcB, lab: "B" });
    for (let j = 1; j <= VC.J; j++) rows.push({ grp: "cover", v: encv(j) + vcB, lab: `\\ell'_{${j}}`, j });
    VC.edges.forEach(([u, w]) => rows.push({ grp: "edge", v: encv(u) + encv(w) + vcB, lab: `\\ell''_{${u},${w}}`, e: [u, w] }));
    return rows;
  }
  function minCoins(target, vocab) {
    const keys = Array.from(vocab.keys());
    if (vocab.has(target)) return [target];
    for (const a of keys) { const b = target - a; if (b > 0n && vocab.has(b)) return [a, b]; }
    for (const a of keys) for (const b of keys) { const c = target - a - b; if (c > 0n && vocab.has(c)) return [a, b, c]; }
    return null;
  }
  function renderVC() {
    const psi = +$("vcPsi").value;
    $("vcPsiV").textContent = psi;
    $("vcMode").textContent = VC.manual
      ? "Your own choice of cover-strings. Move ψ to return to the best tokeniser."
      : "Showing the best tokeniser for this budget. Tap vertices to choose your own.";
    // graph: edges carry their edge-string, split into the tokens that encode it
    const covered = e => VC.cover.has(e[0]) || VC.cover.has(e[1]);
    let g = `<svg viewBox="16 22 512 474" role="img" aria-label="Graph for vertex cover">`;
    let labels = "";
    VC.edges.forEach(e => {
      const [u, w] = e, [a, b] = [VC.pos[u], VC.pos[w]];
      const cov = covered(e);
      g += `<g class="e ${cov ? "cov" : "unc"}"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/></g>`;
      let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      if (ang > 90) ang -= 180; if (ang <= -90) ang += 180;
      const rad = ang * Math.PI / 180, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const ox = Math.sin(rad) * 12, oy = -Math.cos(rad) * 12;
      const c = VC.cover.has(u) ? u : w, o = c === u ? w : u;
      const txt = cov ? `(v${c}+B) + v${o}` : `v${u} + v${w} + B`;
      labels += `<text class="elab ${cov ? "cov" : "unc"}" transform="translate(${(mx + ox).toFixed(1)} ${(my + oy).toFixed(1)}) rotate(${ang.toFixed(1)})">${txt}</text>`;
    });
    g += labels;
    for (let j = 1; j <= VC.J; j++) {
      const [x, y] = VC.pos[j], inC = VC.cover.has(j);
      g += `<g class="v${inC ? " in" : ""}" data-j="${j}" tabindex="0" role="button" aria-label="vertex ${j}${inC ? ", in cover" : ""}"><circle cx="${x}" cy="${y}" r="22"/><text x="${x}" y="${y}">v${j}</text></g>`;
      if (inC) {
        const [dx, dy] = VC.tag[j];
        g += `<text class="vtag" x="${x + dx}" y="${y + dy}">v${j}+B</text>`;
      }
    }
    g += `</svg><div class="hmap-legend" style="margin-top:4px"><span><i style="background:var(--magenta)"></i>covered: 2 tokens</span><span><i style="background:var(--orange)"></i>uncovered: 3 tokens</span><span><i style="background:var(--p-pink);border:1.5px solid var(--magenta)"></i>cover-string chosen as a token</span></div>`;
    $("vcGraph").innerHTML = g;
    $("vcGraph").querySelectorAll(".v").forEach(el => {
      const toggle = () => { const j = +el.dataset.j; VC.cover.has(j) ? VC.cover.delete(j) : VC.cover.add(j); VC.manual = true; renderVC(); };
      el.addEventListener("click", toggle);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
    // vocabulary: all vertex-strings, B, and the cover-strings of chosen vertices
    const vocab = new Map();
    for (let j = 1; j <= VC.J; j++) vocab.set(encv(j), `\\tk{\\ell_{${j}}}`);
    vocab.set(vcB, "\\tk{B}");
    VC.cover.forEach(j => vocab.set(encv(j) + vcB, `\\tk{\\ell'_{${j}}}`));
    // table
    const rows = vcTargets();
    let html = `<thead><tr><th>string</th><th title="N^4">${T("N^4")}</th><th class="d3">${T("N^3")}</th><th>${T("N^2")}</th><th>${T("N^1")}</th><th>${T("N^0")}</th><th style="text-align:left">tokenisation</th><th>#</th></tr></thead><tbody>`;
    const groupNames = { vertex: "vertex-strings + B", cover: "cover-strings", edge: "edge-strings" };
    let lastGrp = null, total = 0;
    rows.forEach(r => {
      if (r.grp !== lastGrp) { html += `<tr class="grp"><td colspan="8">${groupNames[r.grp]}</td></tr>`; lastGrp = r.grp; }
      const d = digitsOf(r.v);
      const coins = minCoins(r.v, vocab);
      const n = coins ? coins.length : 4;
      total += n;
      const decomp = coins ? T(coins.map(c => vocab.get(c)).join(" + ")) : "-";
      const cls = ["dgB", "d3", "dg3", "", "dg1"];
      html += `<tr class="${vocab.has(r.v) ? "isvocab" : ""}" title="length = ${r.v.toString()}"><td>${T(`\\cc{${r.lab}}`)}</td>${d.map((x, k) => `<td class="dg ${cls[k]}${x === 0n ? " zero" : ""}">${x.toString()}</td>`).join("")}<td class="tk">${decomp}</td><td class="cnt cnt-${Math.min(n, 3)}">${n}</td></tr>`;
    });
    html += `</tbody>`;
    $("vcTable").innerHTML = html;
    // totals
    const J = VC.J, I = VC.edges.length, K = J + 1 + psi, delta = 3 * J + 2 * I + 1 - psi;
    const unc = VC.edges.filter(e => !covered(e)).length;
    const isCover = unc === 0, size = VC.cover.size;
    let verdict;
    if (!VC.manual && !isCover) verdict = `<span class="pill-no">misses δ</span><span>no vertex cover of size ${psi} exists, so even the best tokeniser misses ${T("\\delta")}</span>`;
    else if (!VC.manual && total <= delta) verdict = `<span class="pill-ok">reaches δ</span><span class="ok">a vertex cover of size ${size} exists</span>`;
    else if (size > psi) verdict = `<span class="pill-no">over budget</span><span class="no">${size} cover tokens but ${T(`\\psi = ${psi}`)}</span>`;
    else if (!isCover) verdict = `<span class="pill-no">${unc} edge${unc > 1 ? "s" : ""} uncovered</span><span>each costs a 3rd symbol</span>`;
    else if (total <= delta) verdict = `<span class="pill-ok">reaches δ</span><span class="ok">a vertex cover of size ${size} ≤ ψ</span>`;
    else verdict = `<span class="pill-ok">valid cover</span><span class="ok">spend the ${psi - size} spare token${psi - size > 1 ? "s" : ""} on any other cover-string to reach ${T("\\delta")}</span>`;
    $("vcTotal").innerHTML =
      `<div class="eq">${T(`\\G_\\ell = ${total}`)} &nbsp; vs. &nbsp; ${T(`\\delta = 3J + 2I + 1 - \\psi = ${delta}`)}</div>` +
      `<div class="hint" style="margin-top:4px">${T(`K = J + 1 + \\psi = ${K}`)}; vocabulary uses ${J + 1 + size} tokens.</div>` +
      `<div class="verdict">${verdict}</div>`;
  }
  // best use of psi cover-string tokens: the psi vertices covering the most edges
  function bestCover(psi) {
    const k = Math.min(psi, VC.J);
    let best = null, bc = -1;
    for (let m = 0; m < (1 << VC.J); m++) {
      const s = []; for (let j = 0; j < VC.J; j++) if ((m >> j) & 1) s.push(j + 1);
      if (s.length !== k) continue;
      const c = VC.edges.filter(([u, w]) => s.includes(u) || s.includes(w)).length;
      if (c > bc) { bc = c; best = s; }
    }
    return best;
  }
  if ($("vcDemo")) {
    $("vcPsi").max = VC.J;
    if ($("vcNval")) $("vcNval").textContent = vcN.toLocaleString("en");
    const auto = () => { VC.manual = false; VC.cover = new Set(bestCover(+$("vcPsi").value)); renderVC(); };
    $("vcPsi").addEventListener("input", auto);
    auto();
  }

  /* ---------------------------------------------------------------------
     Addition chain ↔ unary OPE
     ------------------------------------------------------------------- */
  if ($("addChain")) {
    const targets = new Set([5, 7, 12]);
    const steps = [[1, 1], [2, 1], [2, 3], [5, 2], [7, 5]];
    const blocks = (n, cls) => `<span class="ablocks ${cls}">${"<i></i>".repeat(n)}</span>`;
    $("addChain").innerHTML = steps.map(([a, b], k) => {
      const s = a + b;
      return `<div class="chain-row"><span class="lbl">${T(`\\tk{m_{${k + 1}}}: \\tk{\\mathtt{a}^{${a}}} \\mathbin{\\tk{\\circledcirc}} \\tk{\\mathtt{a}^{${b}}}`)}</span>${blocks(a, "l")}${blocks(b, "r")}<span class="hint">→ ${T(`\\tk{\\mathtt{a}^{${s}}}`)}</span>${targets.has(s) ? `<span class="tgt">target</span>` : ""}</div>`;
    }).join("");
  }
})();
