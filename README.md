# Tokenisation over Bounded Alphabets is Hard: project page

Project page for the ICLR 2026 paper by Violeta Kastreva, Philip Whittington, Dennis Komm and Tiago Pimentel.
Paper: https://openreview.net/forum?id=Xhf9YqwlM4

## Interactive figures

- **Bottom-up tokenisation**: steps through a merge sequence; dragging K re-learns merges with greedy BPE.
- **Direct tokenisation**: draws the token lattice and highlights the shortest path.
- **Approximation ratio**: compares the ratio under compressed length vs. compression reduction.
- **3-OCC-MAX2SAT → binary direct**: builds D1–D4 for an instance, tokenises them exactly, and checks `329J + 3I − γ*`.
- **Vertex cover → unary direct**: dragging ψ shows the best tokeniser for that budget, with string lengths as base-N digits.

Notation macros (`\cc`, `\tk`, `\fn`, `\tok`, `\tokd`, `\toku`, `\xT`, …) are defined in `MACROS` at the top of `js/main.js`.
