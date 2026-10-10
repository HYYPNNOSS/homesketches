const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Bound the UI wait even when an adapter ignores its cancellation signal. */
export function withRequestDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  controller: AbortController,
  timeoutMs?: number,
): Promise<T> {
  const delay = typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.min(timeoutMs, MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;
  const signal = controller.signal;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (complete: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      complete();
    };
    const onAbort = () => finish(() => reject(new DOMException('Request cancelled.', 'AbortError')));
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      finish(() => reject(new DOMException('Request timed out.', 'TimeoutError')));
      controller.abort();
    }, delay);

    // The Promise boundary handles both synchronous adapter errors and rejections.
    Promise.resolve().then(() => {
      if (signal.aborted) throw new DOMException('Request cancelled.', 'AbortError');
      return operation(signal);
    }).then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error)),
    );
  });
}
