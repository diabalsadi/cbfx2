"use client";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLoginModal } from "@/contexts/LoginModalContext";
import { useAuth } from "@/contexts/AuthContext";
import { publicApi, type AdBannerContent } from "@/helpers/api";
import Recaptcha, { type RecaptchaHandle } from "@/components/Recaptcha";
import styles from "./LoginModal.module.scss";

function LogoIcon() {
  return (
    <div className={styles.logoIcon}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
        <polyline
          points="4,22 10,14 16,18 24,8"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function LoginModal() {
  const t = useTranslations("loginModal");
  const { isOpen, closeLoginModal } = useLoginModal();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState<AdBannerContent | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<RecaptchaHandle>(null);

  useEffect(() => {
    if (!isOpen) return;
    publicApi
      .adBanners("signin")
      .then((banners) => setBanner(banners.featured_broker ?? null))
      .catch(() => setBanner(null));
  }, [isOpen]);

  // lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLoginModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeLoginModal]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!captchaToken) {
      setError(t("completeCaptcha"));
      return;
    }
    setLoading(true);
    try {
      await login(email, password, "user", captchaToken);
      closeLoginModal();
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setLoading(false);
      captchaRef.current?.reset();
    }
  }

  return (
    <div className={styles.overlay} onClick={closeLoginModal}>
      <div
        className={`${styles.wrapper} ${!banner ? styles.wrapperSingle : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left: login form ── */}
        <div className={styles.loginCard}>
          <button
            className={styles.closeBtn}
            onClick={closeLoginModal}
            aria-label={t("close")}
          >
            ✕
          </button>

          <LogoIcon />
          <h2 className={styles.title}>CBFX</h2>
          <p className={styles.subtitle}>{t("signInToAccount")}</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="modal-email">
                {t("email")}
              </label>
              <input
                id="modal-email"
                type="email"
                className={styles.input}
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className={styles.label} htmlFor="modal-password">
                  {t("password")}
                </label>
                <Link href="/forgot-password" className={styles.link} style={{ fontSize: "12px" }} onClick={closeLoginModal}>
                  {t("forgotPassword")}
                </Link>
              </div>
              <input
                id="modal-password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Recaptcha ref={captchaRef} onChange={setCaptchaToken} />

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              type="submit"
              className={styles.signInBtn}
              disabled={loading}
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <p className={styles.footer}>
            {t("noAccount")}{" "}
            <Link
              href="/register"
              className={styles.link}
              onClick={closeLoginModal}
            >
              {t("signUp")}
            </Link>
          </p>
        </div>

        {/* ── Right: featured broker ── */}
        {banner?.image_url && (
          <div className={styles.brokerCard}>
            <span className={styles.featuredLabel}>{t("featuredBroker")}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.image_url} alt={banner.alt} className={styles.brokerImage} />
            <a
              href={banner.link_url || "#"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={styles.openAccountBtn}
            >
              {t("openAccount")} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
