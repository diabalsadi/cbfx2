"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSigninBanner } from "@/helpers/useSigninBanner";
import FeaturedBrokerPanel from "@/components/FeaturedBrokerPanel";
import Recaptcha, { type RecaptchaHandle } from "@/components/Recaptcha";
import styles from "./login.module.scss";

function LogoIcon() {
  return (
    <div className={styles.logoIcon}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
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

export default function UserLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const banner = useSigninBanner();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<RecaptchaHandle>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!captchaToken) {
      setError("Please complete the captcha");
      return;
    }
    setLoading(true);
    try {
      await login(email, password, "user", captchaToken);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
      captchaRef.current?.reset();
    }
  }

  return (
    <div className={`${styles.wrapper} ${!banner ? styles.wrapperSingle : ""}`}>
      {/* ── Left: Login form ── */}
      <div className={styles.loginCard}>
        <div className={styles.logoRow}>
          <LogoIcon />
        </div>
        <h1 className={styles.title}>CBFX</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
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
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
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

          <button type="submit" className={styles.signInBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>

      <FeaturedBrokerPanel banner={banner} />
    </div>
  );
}
