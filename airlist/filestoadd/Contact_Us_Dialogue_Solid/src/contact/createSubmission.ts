import { createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { StatusHandler, SubmissionHandler, SubmissionResult } from './types';
import { withRequestDeadline } from './requestDeadline';

export type SubmissionState =
  | { status: 'idle' | 'demo' }
  | { status: 'pending'; requestId: string; checking: boolean }
  | (SubmissionResult & { requestId: string });

export const DEMO_NOTICE = 'Design reference only. Nothing has been sent.';

function makeRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `nglob-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Local state only. All network activity belongs to the optional adapters.
 * Getter arguments keep adapters reactive when a parent replaces its props.
 */
export function createSubmission<T>(
  getOnSubmit: Accessor<SubmissionHandler<T> | undefined>,
  getOnCheckStatus: Accessor<StatusHandler | undefined>,
  getTimeoutMs: Accessor<number | undefined>,
) {
  const [state, setState] = createSignal<SubmissionState>({ status: 'idle' });
  let active: AbortController | null = null;
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    active?.abort();
    active = null;
  });

  async function run(
    requestId: string,
    checking: boolean,
    operation: (signal: AbortSignal) => Promise<SubmissionResult>,
  ) {
    if (active || disposed) return;
    const controller = new AbortController();
    active = controller;
    setState({ status: 'pending', requestId, checking });
    let result: SubmissionResult;
    try {
      const response = await withRequestDeadline(operation, controller, getTimeoutMs());
      // A missing or malformed result cannot confirm receipt.
      result = response && ['received', 'rejected', 'unknown'].includes(response.status)
        ? response
        : { status: 'unknown' };
    } catch {
      // A transport failure does not establish that delivery was rejected.
      result = { status: 'unknown' };
    }
    if (active !== controller || disposed) return;
    active = null;
    setState({ ...result, requestId });
  }

  async function submit(data: T) {
    if (disposed || active || ['pending', 'received', 'unknown'].includes(state().status)) return;
    const onSubmit = getOnSubmit();
    if (!onSubmit) {
      setState({ status: 'demo' });
      return;
    }
    const requestId = makeRequestId();
    await run(requestId, false, signal => onSubmit(data, { requestId, signal }));
  }

  async function checkStatus() {
    const current = state();
    const onCheckStatus = getOnCheckStatus();
    if (disposed || !onCheckStatus || current.status !== 'unknown' || active) return;
    // Reuse the existing request ID; this must never create another submission.
    await run(current.requestId, true, signal => onCheckStatus(current.requestId, { signal }));
  }

  function retry() {
    if (!disposed && state().status === 'rejected') setState({ status: 'idle' });
  }

  function clearDemoNotice() {
    if (!disposed && state().status === 'demo') setState({ status: 'idle' });
  }

  return { state, submit, checkStatus, retry, clearDemoNotice, canCheckStatus: () => Boolean(getOnCheckStatus()) };
}
