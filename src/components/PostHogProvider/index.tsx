import React, { useEffect } from 'react';
import { hasConsent, onConsentChange } from '../../lib/analytics/consent-manager';

// PostHog interface - define only what we use, and guard optional APIs
type PostHogSetConfig = {
  disable_session_recording?: boolean;
};

interface PostHogInstance {
  opt_in_capturing(): void;
  opt_out_capturing(): void;
  set_config?(config: PostHogSetConfig): void;

  // Legacy/direct helpers that may or may not exist on the root instance
  startSessionRecording?: () => void;
  stopSessionRecording?: () => void;

  // Namespaced session recording controls in some versions
  sessionRecording?: {
    startRecording?: () => void;
    stopRecording?: () => void;
  };
}

declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check initial consent status
    const consentGiven = hasConsent();

    if (consentGiven) {
      enablePostHog();
    } else {
      disablePostHog();
    }

    // Listen for consent changes
    const cleanup = onConsentChange((granted) => {
      if (granted) {
        enablePostHog();
      } else {
        disablePostHog();
      }
    });

    return cleanup;
  }, []);

  const enablePostHog = () => {
    if (typeof window === 'undefined' || !window.posthog) return;
    const ph = window.posthog;

    // Re-enable analytics if previously opted out
    try {
      ph.opt_in_capturing();
    } catch {
      // no-op
    }

    // Ensure session recording is enabled via config; don't assume start API exists
    try {
      ph.set_config?.({ disable_session_recording: false });
    } catch {
      // no-op
    }

    // Best-effort: try available start methods without crashing if missing
    ph.startSessionRecording?.();
    ph.sessionRecording?.startRecording?.();
  };

  const disablePostHog = () => {
    if (typeof window === 'undefined' || !window.posthog) return;
    const ph = window.posthog;

    // Disable session recording via config first (works across versions)
    try {
      ph.set_config?.({ disable_session_recording: true });
    } catch {
      // no-op
    }

    // Best-effort: try available stop methods without crashing if missing
    ph.stopSessionRecording?.();
    ph.sessionRecording?.stopRecording?.();

    // Opt out of all analytics capture if consent is denied
    try {
      ph.opt_out_capturing();
    } catch {
      // no-op
    }
  };

  return <>{children}</>;
}