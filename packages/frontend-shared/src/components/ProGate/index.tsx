"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { billingApi } from "@/helpers/api";
import { hasProAccess } from "@/helpers/subscription";
import styles from "./ProGate.module.scss";

export type ProFeature = "signals" | "copyTrading";

// Created once, not per-render — Stripe.js's own recommendation.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function ProGate({
  feature,
  children,
}: {
  feature: ProFeature;
  children: React.ReactNode;
}) {
  const t = useTranslations("proGate");
  const { user, refreshUser } = useAuth();
  const { openLoginModal } = useLoginModal();
  const router = useRouter();
  const pathname = usePathname();
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState("");

  // Returning from a successful embedded Checkout — pull the fresh
  // subscription status once (the webhook usually beats this redirect, but
  // isn't guaranteed to), then drop the query param so a refresh doesn't
  // re-trigger it. Read directly from window rather than useSearchParams()
  // so pages using this component don't need a Suspense boundary just for
  // this (see RegisterClient.tsx for the same pattern).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      refreshUser();
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlocked = hasProAccess(user);

  // Locked pages aren't meant to be scrolled at all — just a fixed teaser
  // behind the subscribe card. Lock body scroll while gated, restore it the
  // moment access is unlocked or the component unmounts.
  useEffect(() => {
    if (unlocked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [unlocked]);

  const fetchClientSecret = useMemo(
    () => async () => {
      const origin = window.location.origin;
      const { client_secret } = await billingApi.createCheckout({
        return_url: `${origin}${pathname}?checkout=success`,
      });
      return client_secret;
    },
    [pathname],
  );

  const handleSubscribeClick = () => {
    if (!stripePromise) {
      setError(t("subscribeFailed"));
      return;
    }
    setError("");
    setShowCheckout(true);
  };

  if (unlocked) {
    return <>{children}</>;
  }

  if (showCheckout) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.checkoutOverlay}>
          <div className={styles.checkoutPanel}>
            <button className={styles.closeBtn} onClick={() => setShowCheckout(false)} aria-label={t("close")}>
              ✕
            </button>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gateWrap}>
      <div className={styles.blurred} aria-hidden="true">
        {children}
      </div>
      <div className={styles.overlay}>
        <div className={styles.card}>
          <div className={styles.lockIcon}>🔒</div>
          <h2 className={styles.title}>{t(`${feature}.title`)}</h2>
          <p className={styles.subtitle}>{t(`${feature}.subtitle`)}</p>
          <p className={styles.price}>{t("priceLabel")}</p>
          {error && <p className={styles.error}>{error}</p>}
          {!user ? (
            <button className={styles.primaryBtn} onClick={openLoginModal}>
              {t("signInToUnlock")}
            </button>
          ) : (
            <button className={styles.primaryBtn} onClick={handleSubscribeClick}>
              {t("subscribeNow")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
