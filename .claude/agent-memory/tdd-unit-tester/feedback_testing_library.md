---
name: Testing library packages installed
description: Only @testing-library/react, @testing-library/jest-dom, and @testing-library/dom are installed — user-event is absent
type: feedback
---

`@testing-library/user-event` is NOT installed in this project. Only these packages are present under `node_modules/@testing-library/`: `dom`, `jest-dom`, `react`.

**Why:** The project only installed what it needed. Adding user-event was never done.

**How to apply:** Always use `fireEvent` from `@testing-library/react` for simulating clicks, changes, and other DOM events. Never import from `@testing-library/user-event`. If async interaction behavior is needed, `fireEvent` is synchronous and sufficient for this codebase.
