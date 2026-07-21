# Error Handling

> Failure semantics across the engine, application, and local persistence.

---

## Overview

There is no HTTP error response contract. Failures are classified at local
boundaries so expected player mistakes do not become exceptions and storage
failures do not publish uncommitted state.

---

## Error Types

- Expected command failures use discriminated results such as CommandResultV2
  with ok: false and a typed rejection code/message.
- Invariant and malformed durable-data failures throw Error or RangeError
  because they indicate corrupt state or a programming error.
- The application transaction returns CommittedCommandResult codes:
  domain-rejected, invariant-failed, projection-failed, and
  persistence-failed.
- Redux thunks convert boundary failures into serializable Chinese error
  strings for application state.

---

## Error Handling Patterns

Keep catches at boundaries that can add meaning or restore atomicity:

~~~ts
try {
  await repository.commitCheckpoint(projectedProfile, proposal.state);
} catch (error) {
  const detail = error instanceof Error ? error.message : '未知存储错误';
  return {
    ok: false,
    code: 'persistence-failed',
    message: '自动保存失败：' + detail,
    profile,
    state: currentState,
  };
}
~~~

IndexedDB transaction catches abort the transaction, await its rejected done
promise, and rethrow. React rendering failures are handled by
ApplicationErrorBoundary, which shows a reload action and does not claim that
local data was changed.

---

## API Error Responses

Not applicable: the application has no API client or server. User-facing
failure text lives in Redux state or the render error boundary. If an HTTP
service is introduced, define its transport-safe error schema separately
instead of reusing internal Error objects.

---

## Common Mistakes

- Do not throw for normal illegal moves; return a domain rejection.
- Do not swallow transaction errors or advance Redux after persistence fails.
- Do not use an untyped catch value without narrowing it with
  error instanceof Error.
- Do not show raw stack traces in the UI.
- Do not catch an error merely to return a partially mutated profile/run pair.
