---
name: useSmartInterval getMsToNext call sequencing in tests
description: getMsToNext is called once per schedule() invocation; each tick triggers one reschedule call
type: reference
---

`useSmartInterval` calls `getMsToNext()` exactly once per `schedule()` invocation. The call sequence for a mock is:

1. Initial `schedule()` call on mount → getMsToNext() call #1 → determines first interval
2. After first tick fires → `clearInterval` + `schedule()` → getMsToNext() call #2 → determines second interval
3. After second tick fires → `clearInterval` + `schedule()` → getMsToNext() call #3 → determines third interval

When writing tests that control interval switching (slow → slow → fast), use `mockReturnValueOnce` chains:
```js
getMsToNext
  .mockReturnValueOnce(FIVE_MINUTES_MS + 1)  // call #1: initial schedule → 60s
  .mockReturnValueOnce(FIVE_MINUTES_MS + 1)  // call #2: after 1st tick → 60s
  .mockReturnValue(FIVE_MINUTES_MS)           // call #3+: after 2nd tick → 1s
```

This means advancing 60s fires tick #1, advancing another 60s fires tick #2, then advancing 1s fires tick #3.
