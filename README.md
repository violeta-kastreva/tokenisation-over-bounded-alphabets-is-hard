# Tokenisation over Bounded Alphabets is Hard: project page

Static project page for the ICLR 2026 paper by Violeta Kastreva, Philip Whittington, Dennis Komm and Tiago Pimentel.
Paper: https://openreview.net/forum?id=Xhf9YqwlM4

```
index.html        page content (math written in LaTeX, rendered with KaTeX)
css/style.css     colour system: paper notation (blue/magenta/orange) + poster pastels
js/main.js        KaTeX macros + interactive figures
assets/           poster.pdf (high quality), poster.webp (preview image)
llms.txt          short summary for AI agents and tools (linked in the footer)
llms-full.txt     longer summary: definitions, reductions, theorems, citation
.nojekyll         tells GitHub Pages to serve the files as-is
```

No build step and nothing to install. KaTeX and the fonts load from public CDNs.

## Preview locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy on GitHub Pages

1. Create an empty repository on GitHub (for example `tokenisation-is-hard`).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Project page"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<user>.github.io/<repo>/`.

All paths are relative, so the page works both under a repo path and on a custom domain.

### Optional, once you know the final URL

Link previews (Twitter, Slack, …) need an absolute image URL. In `index.html`, change

```html
<meta property="og:image" content="assets/poster.webp">
```

to `https://<user>.github.io/<repo>/assets/poster.webp`.

## Interactive figures

- **Bottom-up tokenisation**: steps through a merge sequence; dragging K re-learns merges with greedy BPE.
- **Direct tokenisation**: draws the token lattice and highlights the shortest path.
- **Approximation ratio**: compares the ratio under compressed length vs. compression reduction.
- **3-OCC-MAX2SAT → binary direct**: builds D1–D4 for an instance, tokenises them exactly, and checks `329J + 3I − γ*`.
- **Vertex cover → unary direct**: dragging ψ shows the best tokeniser for that budget, with string lengths as base-N digits.

Notation macros (`\cc`, `\tk`, `\fn`, `\tok`, `\tokd`, `\toku`, `\xT`, …) are defined in `MACROS` at the top of `js/main.js`.
