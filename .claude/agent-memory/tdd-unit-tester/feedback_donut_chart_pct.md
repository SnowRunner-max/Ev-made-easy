---
name: DonutChart percentage query pattern
description: getAllByText with a % regex matches SVG strokeDasharray attributes and produces double-counts
type: feedback
---

Querying with `screen.getAllByText(/%$/)` in DonutChart tests finds 4 elements instead of 2 because SVG `strokeDasharray` attributes like `"58, 100"` are exposed as text content in jsdom, inflating the match count.

**Why:** The SVG paths in DonutChart use `strokeDasharray={`${delivPct}, 100`}` which jsdom exposes as text, matching the regex.

**How to apply:** Always use exact text queries: `screen.getByText('58%')` and `screen.getByText('42%')`. Never use a broad regex that matches percentage-like strings when SVG elements are present.
