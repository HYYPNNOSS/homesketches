import {
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  Show,
  Switch,
  Match,
} from 'solid-js';
import { Modal } from './Modal';
import type { VerificationConfig, VerificationPreviewState, VerificationResult } from './types';

type Step = VerificationPreviewState | 'preview-finish';

export interface VerificationDialogProps {
  open: boolean;
  onClose: () => void;
  config: VerificationConfig;
  contactUrl: string;
  quoteUrl?: string;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const RESULT_STATUSES = new Set(['received', 'reviewing', 'approved', 'rejected']);

function hasNoticeUrl(value: string): boolean {
  if (!value?.trim() || value.trim().startsWith('#')) return false;
  try {
    const url = new URL(value, 'https://local.invalid/');
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** The host adapter owns authentication, server validation, storage and review. */
function validateResult(value: unknown, expectedId?: string): VerificationResult {
  if (!value || typeof value !== 'object') throw new Error('Invalid verification response');
  const result = value as Record<string, unknown>;
  if (
    typeof result.id !== 'string' ||
    !result.id.trim() ||
    result.id !== result.id.trim() ||
    result.id.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(result.id) ||
    (expectedId !== undefined && result.id !== expectedId) ||
    typeof result.status !== 'string' ||
    !RESULT_STATUSES.has(result.status) ||
    (result.reason !== undefined &&
      (typeof result.reason !== 'string' || result.reason.length > 2000))
  ) {
    throw new Error('Invalid verification response');
  }
  return {
    id: result.id,
    status: result.status as VerificationResult['status'],
    ...(typeof result.reason === 'string' ? { reason: result.reason } : {}),
  };
}

function newRequestKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function VerificationDialog(props: VerificationDialogProps) {
  const initialPreviewStep = (): Step =>
    props.config.mode === 'preview' ? (props.config.initialState ?? 'choose') : 'choose';
  const [step, setStep] = createSignal<Step>(initialPreviewStep());
  const [file, setFile] = createSignal<File | null>(null);
  const [sample, setSample] = createSignal(
    props.config.mode === 'preview' && initialPreviewStep() !== 'choose',
  );
  const [imageUrl, setImageUrl] = createSignal<string | null>(null);
  const [error, setError] = createSignal('');
  const [result, setResult] = createSignal<VerificationResult | null>(null);
  const [busy, setBusy] = createSignal(false);
  const helpId = `ngs-file-help-${createUniqueId()}`;
  const errorId = `ngs-file-error-${createUniqueId()}`;
  let fileInput: HTMLInputElement | undefined;
  let chooseButton: HTMLButtonElement | undefined;
  let fileTitle: HTMLElement | undefined;
  let objectUrl: string | null = null;
  let requestKey: string | null = null;
  let requestVersion = 0;
  let activeController: AbortController | null = null;
  let wasOpen = false;
  let previousConfig: VerificationConfig | undefined;

  const isPreview = () => props.config.mode === 'preview';
  const isLiveReady = () => {
    const config = props.config;
    return (
      config.mode === 'live' &&
      hasNoticeUrl(config.privacyNoticeUrl) &&
      Boolean(config.privacySummary?.trim()) &&
      typeof config.service?.submit === 'function' &&
      typeof config.service?.getStatus === 'function'
    );
  };
  const isAvailable = () => isPreview() || isLiveReady();
  const hasDocument = () => Boolean(file() || sample());

  function clearSelection() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    requestKey = null;
    setImageUrl(null);
    setFile(null);
    setSample(false);
    if (fileInput) fileInput.value = '';
  }

  function cancelOperation() {
    requestVersion += 1;
    activeController?.abort();
    activeController = null;
    setBusy(false);
  }

  function reset(config?: VerificationConfig) {
    cancelOperation();
    clearSelection();
    setResult(null);
    setError('');
    const next = config?.mode === 'preview' ? (config.initialState ?? 'choose') : 'choose';
    setStep(next);
    setSample(config?.mode === 'preview' && next !== 'choose');
  }

  createEffect(() => {
    const open = props.open;
    const config = props.config;
    if (config !== previousConfig) {
      // A new configuration marks a new integration/authenticated session.
      reset(open ? config : undefined);
    } else if (!open) {
      if (config.mode === 'live') {
        cancelOperation();
        clearSelection();
        setError('');
        // Only the last confirmed outcome survives closing; never keep the file.
        setStep(untrack(result)?.status ?? 'choose');
      } else reset();
    } else if (!wasOpen) {
      if (config.mode === 'live') setStep(untrack(result)?.status ?? 'choose');
      else reset(config);
    }
    wasOpen = open;
    previousConfig = config;
  });

  onCleanup(() => {
    cancelOperation();
    clearSelection();
    setResult(null);
  });

  function acceptFiles(files: readonly File[]) {
    if (activeController || !isAvailable()) return;
    if (files.length !== 1) {
      setError('Please choose just one document.');
      return;
    }
    const chosen = files[0];
    if (!ACCEPTED_TYPES.has(chosen.type)) {
      setError('Choose a JPG, PNG, WebP or PDF file.');
      return;
    }
    if (chosen.size === 0) {
      setError('This file is empty. Choose another document.');
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setError('This file is larger than 10 MB. Choose a smaller file.');
      return;
    }
    clearSelection();
    setFile(chosen);
    if (chosen.type.startsWith('image/')) {
      objectUrl = URL.createObjectURL(chosen);
      setImageUrl(objectUrl);
    }
    setResult(null);
    setError('');
    setStep('choose');
    queueMicrotask(() => {
      if (props.open && file() === chosen) fileTitle?.focus({ preventScroll: true });
    });
  }

  function chooseFile() {
    if (busy()) return;
    setError('');
    fileInput?.click();
  }

  function removeDocument() {
    if (busy()) return;
    clearSelection();
    setResult(null);
    setError('');
    setStep('choose');
    chooseButton?.focus();
  }

  function useSample() {
    if (!isPreview()) return;
    clearSelection();
    setSample(true);
    setError('');
    setStep('choose');
  }

  function reviewDocument() {
    if (!hasDocument()) {
      setError('Choose one document to continue.');
      chooseButton?.focus();
      return;
    }
    setError('');
    setStep('review');
  }

  function replaceDocument() {
    if (busy()) return;
    setResult(null);
    setStep('choose');
    chooseFile();
  }

  async function submitDocument() {
    if (activeController || !hasDocument()) return;
    if (isPreview()) {
      setError('');
      setStep('preview-finish');
      return;
    }
    const config = props.config;
    const selectedFile = file();
    if (config.mode !== 'live' || !isLiveReady() || !selectedFile) return;
    try {
      requestKey ??= newRequestKey();
    } catch {
      setError('This browser could not start the request. Please contact us for help.');
      return;
    }
    const controller = new AbortController();
    const version = ++requestVersion;
    activeController = controller;
    setBusy(true);
    setError('');
    setStep('uploading');
    try {
      const response = await config.service.submit(selectedFile, {
        signal: controller.signal,
        idempotencyKey: requestKey,
      });
      if (controller.signal.aborted || version !== requestVersion || !props.open) return;
      const verifiedResponse = validateResult(response);
      setResult(verifiedResponse);
      clearSelection();
      setStep(verifiedResponse.status);
    } catch {
      if (controller.signal.aborted || version !== requestVersion || !props.open) return;
      setError(
        'We could not confirm whether your request was received. Try again to check this same request, or contact us for help.',
      );
      setStep('error');
      // Keep the file and requestKey: the adapter must deduplicate retries of this request.
    } finally {
      if (version === requestVersion) {
        activeController = null;
        setBusy(false);
      }
    }
  }

  async function refreshStatus() {
    const config = props.config;
    const current = result();
    if (activeController || config.mode !== 'live' || !isLiveReady() || !current) return;
    const controller = new AbortController();
    const version = ++requestVersion;
    activeController = controller;
    setBusy(true);
    setError('');
    try {
      const response = await config.service.getStatus(current.id, { signal: controller.signal });
      if (controller.signal.aborted || version !== requestVersion || !props.open) return;
      const verifiedResponse = validateResult(response, current.id);
      setResult(verifiedResponse);
      setStep(verifiedResponse.status);
    } catch {
      if (controller.signal.aborted || version !== requestVersion || !props.open) return;
      setError(
        'We could not get an update. Your last confirmed status is shown. Try refreshing again or contact us for help.',
      );
    } finally {
      if (version === requestVersion) {
        activeController = null;
        setBusy(false);
      }
    }
  }

  const title = () => {
    if (!isAvailable()) return 'Student verification is not available yet.';
    switch (step()) {
      case 'review':
        return 'A quick look before you continue.';
      case 'uploading':
        return isPreview() ? 'Example: sending a document.' : 'Sending your document…';
      case 'received':
        return 'Document received.';
      case 'reviewing':
        return 'Your document is being reviewed.';
      case 'approved':
        return 'Student status verified.';
      case 'rejected':
        return 'We need a different document.';
      case 'error':
        return isPreview()
          ? 'Example: submission not confirmed.'
          : 'Your submission could not be confirmed.';
      case 'preview-finish':
        return 'Preview complete. Nothing sent.';
      default:
        return 'Your student check. One document.';
    }
  };

  function DocumentCard() {
    return (
      <div class="ngs-file-card">
        <strong ref={fileTitle} tabIndex={-1}>
          {sample() ? 'Example student proof — sample only' : file()?.name}
        </strong>
        <p class="ngs-caption">
          {sample()
            ? 'Fictional example · Not a valid document'
            : `${((file()?.size ?? 0) / 1024 / 1024).toFixed(2)} MB`}
        </p>
        <Show when={sample()}>
          <div class="ngs-info">
            <strong>SAMPLE · NOT A REAL DOCUMENT</strong>
            <p>
              Alex Student
              <br />
              Example University
              <br />
              Current student — 2026/27
            </p>
          </div>
        </Show>
        <Show when={imageUrl()}>
          {(url) => (
            <img class="ngs-file-preview" src={url()} alt="Preview of the document you selected" />
          )}
        </Show>
        <div class="ngs-actions">
          <button type="button" class="ngs-link" onClick={chooseFile}>
            Replace document
          </button>
          <button type="button" class="ngs-link" onClick={removeDocument}>
            Remove document
          </button>
        </div>
      </div>
    );
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={title()}>
      <Show
        when={isAvailable()}
        fallback={
          <>
            <p class="ngs-dialog-lead">
              Please contact Nglob about your student offer. Do not send your student document by
              email.
            </p>
            <p class="ngs-caption">No document can be submitted from this page.</p>
            <div class="ngs-actions">
              <a class="ngs-button ngs-button-primary" href={props.contactUrl}>
                Contact Nglob
              </a>
              <button type="button" class="ngs-button ngs-button-secondary" onClick={props.onClose}>
                Close
              </button>
            </div>
          </>
        }
      >
        <Show when={isPreview()}>
          <p class="ngs-preview-notice">Preview only. Nothing is uploaded or approved.</p>
        </Show>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,application/pdf"
          aria-label="Choose one proof of student status"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = '';
            if (files.length) acceptFiles(files);
          }}
        />
        <Switch>
          <Match when={step() === 'choose' || step() === 'review'}>
            <p class="ngs-dialog-lead">
              {step() === 'review'
                ? 'Check that your name, institution and current student status are readable.'
                : 'Any one document showing your name, institution and current student status.'}
            </p>
            <details class="ngs-proof-help" id={helpId}>
              <summary>What can I use and hide?</summary>
              <p>
                A student card, enrolment letter or official student-portal screenshot can work.
                These are examples, not the only options.
              </p>
              <p>
                You can cover your address, date of birth, student number, QR codes, grades and
                financial details before choosing your file. Keep your name, institution and current
                status readable.
              </p>
              <p>Please do not upload a passport or bank statement.</p>
            </details>
            <Show
              when={hasDocument()}
              fallback={
                <div
                  class="ngs-upload"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    acceptFiles(Array.from(event.dataTransfer?.files ?? []));
                  }}
                >
                  <p>Choose one document, or drop it here.</p>
                  <button
                    ref={chooseButton}
                    type="button"
                    class="ngs-button ngs-button-primary"
                    aria-describedby={`${helpId} ${errorId}`}
                    onClick={chooseFile}
                  >
                    Choose document
                  </button>
                  <p class="ngs-caption">JPG, PNG, WebP or PDF · Up to 10 MB</p>
                </div>
              }
            >
              <DocumentCard />
            </Show>
            <Show when={isPreview()}>
              <button type="button" class="ngs-link" onClick={useSample}>
                Use a sample document
              </button>
            </Show>
            <Show when={props.config.mode === 'live' && isLiveReady()}>
              <div class="ngs-info">
                <p>{props.config.mode === 'live' ? props.config.privacySummary : ''}</p>
                <a
                  class="ngs-link"
                  href={props.config.mode === 'live' ? props.config.privacyNoticeUrl : undefined}
                >
                  Read the Privacy Notice
                </a>
              </div>
            </Show>
            <div class="ngs-actions">
              <Show
                when={step() === 'review'}
                fallback={
                  <button
                    type="button"
                    class="ngs-button ngs-button-primary"
                    onClick={reviewDocument}
                  >
                    Continue
                  </button>
                }
              >
                <button
                  type="button"
                  class="ngs-button ngs-button-secondary"
                  onClick={() => {
                    setError('');
                    setStep('choose');
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  class="ngs-button ngs-button-primary"
                  onClick={submitDocument}
                >
                  {isPreview() ? 'Preview next step' : 'Submit for review'}
                </button>
              </Show>
            </div>
            <p class="ngs-caption">
              Choosing a document does not verify your status, apply a discount or create a booking.
            </p>
            <Show when={isPreview()}>
              <p class="ngs-caption">
                Your selected file stays in this browser. Closing this window removes it from the
                preview.
              </p>
            </Show>
          </Match>
          <Match when={step() === 'uploading'}>
            <span class="ngs-status-icon" aria-hidden="true">
              …
            </span>
            <p role="status">
              {isPreview()
                ? 'This is an example of the sending state. No upload is taking place.'
                : 'Sending your document for review. Your student status has not been verified.'}
            </p>
            <Show when={!isPreview()}>
              <p class="ngs-caption">
                Closing this window stops waiting here. It may not cancel a request already received
                by Nglob.
              </p>
            </Show>
          </Match>
          <Match when={step() === 'preview-finish'}>
            <p class="ngs-dialog-lead">
              You have reached the end of this preview. Your student status has not been checked. No
              offer or booking has been created.
            </p>
            <div class="ngs-actions">
              <button
                type="button"
                class="ngs-button ngs-button-secondary"
                onClick={() => setStep('review')}
              >
                Back to my document
              </button>
              <button type="button" class="ngs-button ngs-button-primary" onClick={props.onClose}>
                Done
              </button>
            </div>
          </Match>
          <Match when={step() === 'error'}>
            <Show when={isPreview()}>
              <p class="ngs-dialog-lead">
                Example error state. No document has been sent and no decision has been made.
              </p>
            </Show>
            <Show when={!isPreview()}>
              <p class="ngs-dialog-lead">
                The service may have received your document, but we could not confirm the response.
                Your student status is not confirmed here.
              </p>
            </Show>
            <div class="ngs-actions">
              <Show when={!isPreview() && hasDocument()}>
                <button
                  type="button"
                  class="ngs-button ngs-button-primary"
                  onClick={submitDocument}
                >
                  Try again
                </button>
              </Show>
              <button
                type="button"
                class="ngs-button ngs-button-secondary"
                onClick={removeDocument}
              >
                {isPreview() ? 'Try the document preview' : 'Choose another document'}
              </button>
              <a class="ngs-link" href={props.contactUrl}>
                Get help
              </a>
            </div>
          </Match>
          <Match
            when={
              step() === 'received' ||
              step() === 'reviewing' ||
              step() === 'approved' ||
              step() === 'rejected'
            }
          >
            <span class="ngs-status-icon" aria-hidden="true">
              {step() === 'approved' ? '✓' : step() === 'rejected' ? '!' : '…'}
            </span>
            <Switch>
              <Match when={step() === 'received'}>
                <p class="ngs-dialog-lead">
                  Your student status has not been verified yet. Your document is waiting for
                  review.
                </p>
              </Match>
              <Match when={step() === 'reviewing'}>
                <p class="ngs-dialog-lead">
                  Your student check is in progress.
                  <Show when={!isPreview()}> You can request the latest status below.</Show>
                </p>
              </Match>
              <Match when={step() === 'approved'}>
                <p class="ngs-dialog-lead">
                  Review your available student offer and its conditions before booking.
                  Verification does not create a booking or apply a discount by itself.
                </p>
              </Match>
              <Match when={step() === 'rejected'}>
                <p class="ngs-dialog-lead">
                  {isPreview()
                    ? 'Example reason: the document does not show current student status.'
                    : result()?.reason ||
                      'This document did not confirm your student eligibility. Choose another suitable document or contact us for help.'}
                </p>
              </Match>
            </Switch>
            <Show when={!isPreview()}>
              <div class="ngs-actions">
                <Show when={step() === 'approved' && props.quoteUrl}>
                  <a class="ngs-button ngs-button-primary" href={props.quoteUrl}>
                    Get my moving quote
                  </a>
                </Show>
                <Show when={step() === 'received' || step() === 'reviewing'}>
                  <button
                    type="button"
                    class="ngs-button ngs-button-primary"
                    disabled={busy()}
                    onClick={refreshStatus}
                  >
                    {busy() ? 'Checking status…' : 'Refresh status'}
                  </button>
                </Show>
                <Show when={step() === 'rejected'}>
                  <button
                    type="button"
                    class="ngs-button ngs-button-primary"
                    onClick={replaceDocument}
                  >
                    Replace document
                  </button>
                </Show>
                <a class="ngs-link" href={props.contactUrl}>
                  Get help
                </a>
                <button
                  type="button"
                  class="ngs-button ngs-button-secondary"
                  onClick={props.onClose}
                >
                  Close
                </button>
              </div>
              <Show when={busy()}>
                <p class="ngs-caption" role="status">
                  Checking for a status update.
                </p>
              </Show>
            </Show>
          </Match>
        </Switch>
        <p id={errorId} class="ngs-error" role="alert">
          {error()}
        </p>
        <Show
          when={
            isPreview() &&
            ['uploading', 'received', 'reviewing', 'approved', 'rejected'].includes(step())
          }
        >
          <div class="ngs-actions">
            <button type="button" class="ngs-button ngs-button-secondary" onClick={removeDocument}>
              Try the document preview
            </button>
            <button type="button" class="ngs-button ngs-button-primary" onClick={props.onClose}>
              Close preview
            </button>
          </div>
        </Show>
      </Show>
    </Modal>
  );
}
