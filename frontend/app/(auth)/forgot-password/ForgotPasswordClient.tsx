"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminPortal } from "@/helpers/roles";
import { authApi } from "@/helpers/api";
import Recaptcha, { type RecaptchaHandle } from "@/components/Recaptcha";
import registerStyles from "../register/register.module.scss";
import styles from "./forgot-password.module.scss";

function LogoIcon() {
  return (
    <div className={registerStyles.logoIcon}>
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

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 60_000;

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ForgotPasswordClient() {
  const router = useRouter();
  const { loginWithToken } = useAuth();

  const [step, setStep] = useState<"email" | "otp" | "notified">("email");
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<RecaptchaHandle>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifiedMessage, setNotifiedMessage] = useState("");

  const [resetToken, setResetToken] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [resendReadyAt, setResendReadyAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const codeExpired = codeExpiresAt !== null && now >= codeExpiresAt;
  const resendReady = resendReadyAt === null || now >= resendReadyAt;

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!captchaToken) {
      setError("Please complete the captcha");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email, captcha_token: captchaToken });
      if (res.flow === "notified") {
        setNotifiedMessage(res.message);
        setStep("notified");
      } else {
        setResetToken(res.reset_token);
        setCode("");
        setOtpError("");
        const expiresAt = Date.now() + res.expires_in * 1000;
        const readyAt = Date.now() + RESEND_COOLDOWN_MS;
        setCodeExpiresAt(expiresAt);
        setResendReadyAt(readyAt);
        setStep("otp");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't start password reset");
    } finally {
      setLoading(false);
      captchaRef.current?.reset();
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setOtpError("");
    if (newPassword !== confirmPassword) {
      setOtpError("Passwords don't match");
      return;
    }
    setVerifying(true);
    try {
      const token = await authApi.resetPassword({
        email,
        code: code.trim(),
        reset_token: resetToken,
        new_password: newPassword,
      });
      await loginWithToken(token.access_token);
      const meRes = await fetch("/api/proxy/users/me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const me = await meRes.json();
      router.push(canAccessAdminPortal(me.role) ? "/admin" : "/");
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Couldn't reset password");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendOtp() {
    setOtpError("");
    setResending(true);
    try {
      const res = await authApi.resendPasswordResetOtp({ email });
      setCode("");
      const expiresAt = Date.now() + res.expires_in * 1000;
      const readyAt = Date.now() + RESEND_COOLDOWN_MS;
      setCodeExpiresAt(expiresAt);
      setResendReadyAt(readyAt);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Couldn't resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={`${registerStyles.wrapper} ${registerStyles.wrapperSingle}`}>
      <div className={registerStyles.card}>
        <div className={registerStyles.logoRow}>
          <LogoIcon />
        </div>
        <h1 className={registerStyles.title}>CBFX</h1>

        {step === "notified" ? (
          <>
            <p className={registerStyles.subtitle}>Request received</p>
            <p className={styles.successBox}>{notifiedMessage}</p>
            <p className={registerStyles.footer}>
              <Link href="/admin/login" className={registerStyles.link}>
                Back to sign in
              </Link>
            </p>
          </>
        ) : step === "otp" ? (
          <>
            <p className={registerStyles.subtitle}>
              We emailed a 6-digit code to <strong>{email}</strong>. Enter it below with your new
              password.
            </p>

            <form onSubmit={handleResetPassword} className={registerStyles.form}>
              <div className={registerStyles.field}>
                <label className={registerStyles.label} htmlFor="reset-otp">
                  Verification code
                </label>
                <input
                  id="reset-otp"
                  className={`${registerStyles.input} ${registerStyles.otpInput}`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  placeholder="000000"
                  required
                />
                <span className={registerStyles.hint}>
                  {codeExpired
                    ? "Code expired — request a new one below."
                    : `Expires in ${formatCountdown((codeExpiresAt ?? now) - now)}`}
                </span>
              </div>

              <div className={registerStyles.field}>
                <label className={registerStyles.label} htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className={registerStyles.input}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className={registerStyles.field}>
                <label className={registerStyles.label} htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className={registerStyles.input}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {otpError && <p className={registerStyles.errorMsg}>{otpError}</p>}

              <button
                className={registerStyles.submitBtn}
                type="submit"
                disabled={verifying || code.length !== OTP_LENGTH || codeExpired}
              >
                {verifying ? "Resetting…" : "Reset password"}
              </button>
            </form>

            <div className={registerStyles.resendRow}>
              <button
                type="button"
                className={registerStyles.resendBtn}
                onClick={handleResendOtp}
                disabled={resending || !resendReady}
              >
                {resending
                  ? "Sending…"
                  : resendReady
                    ? "Resend code"
                    : `Resend in ${formatCountdown((resendReadyAt ?? now) - now)}`}
              </button>
            </div>

            <p className={registerStyles.footer}>
              Wrong email?{" "}
              <button type="button" className={registerStyles.linkBtn} onClick={() => setStep("email")}>
                Go back
              </button>
            </p>
          </>
        ) : (
          <>
            <p className={registerStyles.subtitle}>
              Enter your account email and we&apos;ll help you get back in.
            </p>

            <form onSubmit={handleRequestReset} className={registerStyles.form}>
              <div className={registerStyles.field}>
                <label className={registerStyles.label} htmlFor="fp-email">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  className={registerStyles.input}
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <Recaptcha ref={captchaRef} onChange={setCaptchaToken} />

              {error && <p className={registerStyles.errorMsg}>{error}</p>}

              <button className={registerStyles.submitBtn} type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </button>
            </form>

            <p className={registerStyles.footer}>
              Remembered it?{" "}
              <Link href="/login" className={registerStyles.link}>
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
