"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import Script from "next/script";
import { useTheme } from "@/contexts/ThemeContext";
import styles from "./Recaptcha.module.scss";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      render: (container: HTMLElement, params: Record<string, unknown>) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export interface RecaptchaHandle {
  // Every submit attempt consumes the token (the backend calls Google's
  // siteverify regardless of whether login/register then succeeds), so
  // callers must reset after every attempt to get a fresh one.
  reset: () => void;
}

interface RecaptchaProps {
  onChange: (token: string | null) => void;
}

const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(function Recaptcha(
  { onChange },
  ref
) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const themeRef = useRef(theme);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const renderWidget = useCallback(() => {
    if (!window.grecaptcha || !SITE_KEY) return;
    // The script's load event fires before Google's internal reCAPTCHA
    // library has finished initializing — calling render() immediately
    // intermittently throws "grecaptcha.render is not a function".
    // ready() is Google's documented way to wait for actual readiness.
    window.grecaptcha.ready(() => {
      if (!window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: themeRef.current,
        callback: (token: string) => onChangeRef.current(token),
        "expired-callback": () => onChangeRef.current(null),
        "error-callback": () => onChangeRef.current(null),
      });
    });
  }, []);

  // next/script dedups <script> tags by src across the whole app — if this
  // component unmounts and remounts (e.g. the signup form's "Go back" from
  // the OTP step, which mounts a fresh Recaptcha instance) after the script
  // already loaded once elsewhere, Script's onLoad never fires again for the
  // new instance, leaving the widget permanently blank. Poll for
  // window.grecaptcha directly instead so remounts render reliably.
  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.grecaptcha) {
      renderWidget();
      return;
    }
    const interval = setInterval(() => {
      if (window.grecaptcha) {
        clearInterval(interval);
        renderWidget();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [renderWidget]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
      onChangeRef.current(null);
    },
  }));

  if (!SITE_KEY) {
    // Fails loud in dev rather than silently letting forms submit without a
    // captcha_token — the backend rejects that anyway once RECAPTCHA_SECRET_KEY
    // is set, so surface the missing config here instead.
    return <p className={styles.missingConfig}>Captcha isn&apos;t configured (NEXT_PUBLIC_RECAPTCHA_SITE_KEY missing).</p>;
  }

  return (
    <>
      <Script src="https://www.google.com/recaptcha/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={containerRef} className={styles.widget} />
    </>
  );
});

export default Recaptcha;
