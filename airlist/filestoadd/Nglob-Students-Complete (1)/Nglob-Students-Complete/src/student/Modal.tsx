import { createEffect, createUniqueId, onCleanup, type JSX } from 'solid-js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
}

/** Native dialog content is rendered as ordinary JSX and is available to SSR. */
export function Modal(props: ModalProps) {
  const titleId = `ngs-modal-title-${createUniqueId()}`;
  let dialog: HTMLDialogElement | undefined;
  let title: HTMLHeadingElement | undefined;
  let returnFocus: HTMLElement | null = null;
  let lockedBody: HTMLElement | null = null;
  let previousOverflow = '';
  let previousTitle = '';

  function releaseBackground() {
    if (lockedBody) {
      lockedBody.style.overflow = previousOverflow;
      lockedBody = null;
    }
    const target = returnFocus;
    returnFocus = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }

  function requestClose() {
    props.onClose();
  }

  createEffect(() => {
    const open = props.open;
    const nextTitle = props.title;
    if (!dialog) return;
    if (open) {
      const opening = !dialog.open;
      if (opening) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        lockedBody = document.body;
        previousOverflow = lockedBody.style.overflow;
        lockedBody.style.overflow = 'hidden';
        dialog.showModal();
      }
      if (opening || nextTitle !== previousTitle) title?.focus({ preventScroll: true });
      previousTitle = nextTitle;
    } else {
      if (dialog.open) dialog.close();
      releaseBackground();
    }
  });

  onCleanup(() => {
    if (dialog?.open) dialog.close();
    releaseBackground();
  });

  function closeFromBackdrop(event: MouseEvent) {
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      requestClose();
    }
  }

  return (
    <dialog
      ref={dialog}
      class="ngs-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (dialog?.open) return; // Ignore a queued close event after a rapid reopen.
        releaseBackground();
        if (props.open) props.onClose();
      }}
      onClick={closeFromBackdrop}
    >
      <div class="ngs-modal-header">
        <span class="ngs-caption">NGLOB · STUDENTS</span>
        <button
          type="button"
          class="ngs-modal-close"
          aria-label="Close window"
          onClick={requestClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="ngs-modal-content">
        <h2 id={titleId} ref={title} tabIndex={-1}>
          {props.title}
        </h2>
        {props.children}
      </div>
    </dialog>
  );
}
