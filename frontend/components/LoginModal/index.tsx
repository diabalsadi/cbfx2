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

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2L3 5v5c0 4.5 3 8.5 7 9.5 4-1 7-5 7-9.5V5L10 2z"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2l2.4 5.2 5.6.8-4 3.9.9 5.6L10 15l-4.9 2.5.9-5.6-4-3.9 5.6-.8L10 2z"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
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
        {banner && (
          <div className={styles.brokerCard}>
            <div className={styles.brokerCardTop}>
              <span className={styles.featuredLabel}>{t("featuredBroker")}</span>
              <span className={styles.sponsoredLabel}>{banner.badge_text}</span>
            </div>

            <div className={styles.brokerHeader}>
              <div className={styles.brokerLogo}>
                {banner.logo_src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.logo_src}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                  />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                    <polyline
                      points="4,22 10,14 16,18 24,8"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div>
                <div className={styles.brokerName}>{banner.sponsor_name}</div>
                <div className={styles.brokerTagline}>{banner.description}</div>
              </div>
            </div>

            {banner.features.length > 0 && (
              <ul className={styles.featureList}>
                {banner.features.map((feature, i) => (
                  <li key={feature}>
                    {i === 0 ? <ShieldIcon /> : <StarIcon />}
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.brokerCta}>
              <a href={banner.link_url || "#"} className={styles.openAccountBtn}>
                {banner.cta_label || t("openAccount")} ↗
              </a>
              {banner.disclaimer && <p className={styles.disclaimer}>{banner.disclaimer}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
