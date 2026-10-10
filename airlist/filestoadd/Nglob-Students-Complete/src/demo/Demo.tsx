import { createSignal, onMount } from 'solid-js';
import { StudentPage, studentLinks, exampleReferralConfig } from '../student';
import type { VerificationConfig, VerificationPreviewState } from '../student/types';
import './demo.css';
import { header, footer } from './shell';

export function Demo() {
  const [verification, setVerification] = createSignal<VerificationConfig>({ mode: 'preview' });
  onMount(() => {
    const state = new URLSearchParams(location.search).get('state');
    const states: VerificationPreviewState[] = [
      'choose',
      'review',
      'uploading',
      'received',
      'reviewing',
      'approved',
      'rejected',
      'error',
    ];
    if (state && states.includes(state as VerificationPreviewState)) {
      setVerification({ mode: 'preview', initialState: state as VerificationPreviewState });
      queueMicrotask(() =>
        document.querySelector<HTMLButtonElement>('#ngs-student-status .ngs-button')?.click(),
      );
    }
  });
  return (
    <>
      <a class="demo-skip" href="#main">
        Skip to content
      </a>
      <div class="demo-shell" innerHTML={header} />
      <StudentPage
        links={studentLinks}
        assetBase="./nglob-students/assets"
        verification={verification()}
        referral={exampleReferralConfig}
      />
      <div class="demo-shell" innerHTML={footer} />
      <aside class="demo-note">
        Design preview. Referral splits are examples. No documents are sent and no booking is
        made here.
      </aside>
    </>
  );
}
