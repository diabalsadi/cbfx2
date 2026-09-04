"use client";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSigninBanner } from "@/helpers/useSigninBanner";
import FeaturedBrokerPanel from "@/components/FeaturedBrokerPanel";
import Recaptcha, { type RecaptchaHandle } from "@/components/Recaptcha";
import { authApi, publicApi, type PublicBroker } from "@/helpers/api";
import styles from "./register.module.scss";

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

interface AccountDraft {
  key: string;
  brokerId: string;
  mt5Number: string;
}

let nextKey = 0;
function newAccountDraft(defaultBrokerId = ""): AccountDraft {
  nextKey += 1;
  return { key: `acct-${nextKey}`, brokerId: defaultBrokerId, mt5Number: "" };
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 60_000;

// Mirrors backend/app/utils/validation.py:validate_password_strength exactly
// — keep both in sync if the rule ever changes.
const MAX_PASSWORD_LENGTH = 128;
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;
const HAS_SPECIAL = /[^\w\s]/;

function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= MAX_PASSWORD_LENGTH &&
    HAS_LOWER.test(password) &&
    HAS_UPPER.test(password) &&
    HAS_DIGIT.test(password) &&
    HAS_SPECIAL.test(password)
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Survives a page refresh while the OTP screen is up — sessionStorage
// (not localStorage) so it naturally clears once the tab/browser closes
// rather than resurrecting a stale signup attempt days later. Only the
// email + timers are kept; the account isn't created until verify-otp, and
// the password never needs to leave state again for that call.
const PENDING_OTP_KEY = "cbfx_pending_otp";

interface PendingOtpState {
  email: string;
  codeExpiresAt: number;
  resendReadyAt: number;
  registrationToken: string;
}

function savePendingOtp(state: PendingOtpState) {
  sessionStorage.setItem(PENDING_OTP_KEY, JSON.stringify(state));
}

function loadPendingOtp(): PendingOtpState | null {
  try {
    const raw = sessionStorage.getItem(PENDING_OTP_KEY);
    return raw ? (JSON.parse(raw) as PendingOtpState) : null;
  } catch {
    return null;
  }
}

function clearPendingOtp() {
  sessionStorage.removeItem(PENDING_OTP_KEY);
}

export default function RegisterPage() {
  const t = useTranslations("register");
  const tAuth = useTranslations("auth");
  const tLogin = useTranslations("loginModal");
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const banner = useSigninBanner();

  const [brokers, setBrokers] = useState<PublicBroker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const passwordInvalid = passwordTouched && !isPasswordValid(password);
  const [referralCode, setReferralCode] = useState("");
  const [accounts, setAccounts] = useState<AccountDraft[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<RecaptchaHandle>(null);

  // Once register() emails an OTP, the form is replaced by a verification
  // step — the account isn't actually created until the code is confirmed.
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [resendReadyAt, setResendReadyAt] = useState<number | null>(null);
  // Proves to the backend this browser is the one that started the current
  // signup attempt — required to verify, and to resubmit register() for the
  // same email (e.g. after "Go back") without it being rejected as a
  // possible hijack of someone else's in-progress signup.
  const [registrationToken, setRegistrationToken] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const codeExpired = codeExpiresAt !== null && now >= codeExpiresAt;
  const resendReady = resendReadyAt === null || now >= resendReadyAt;

  // Resume the OTP screen after a refresh instead of dropping back to the
  // (now-empty) signup form — the backend's pending registration is still
  // there waiting either way.
  useEffect(() => {
    const pending = loadPendingOtp();
    if (pending) {
      setEmail(pending.email);
      setCodeExpiresAt(pending.codeExpiresAt);
      setResendReadyAt(pending.resendReadyAt);
      setRegistrationToken(pending.registrationToken);
      setStep("otp");
    }
  }, []);

  useEffect(() => {
    publicApi
      .brokers()
      .then((list) => {
        setBrokers(list);
        if (list.length === 1) {
          setAccounts((prev) => prev.map((a) => (a.brokerId ? a : { ...a, brokerId: list[0].id })));
        }
      })
      .catch(() => setBrokers([]))
      .finally(() => setBrokersLoading(false));
  }, []);

  // Pre-fill the referral code from a client's shareable link
  // (?referral=CODE, with ?ref=CODE also accepted). Read directly from
  // window rather than useSearchParams() so this page doesn't need a
  // Suspense boundary just for this optional field.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("referral") || params.get("ref");
    if (ref) setReferralCode(ref);
  }, []);

  const updateAccount = (key: string, patch: Partial<AccountDraft>) => {
    setAccounts((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  const addAccount = () => {
    setAccounts((prev) => [...prev, newAccountDraft(brokers.length === 1 ? brokers[0].id : "")]);
  };

  const removeAccount = (key: string) => {
    setAccounts((prev) => prev.filter((a) => a.key !== key));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setPasswordTouched(true);
      setError(tAuth("passwordHint"));
      return;
    }

    for (const a of accounts) {
      if (!a.brokerId) {
        setError(t("selectBrokerEveryAccountError"));
        return;
      }
      if (!a.mt5Number.trim()) {
        setError(t("mt5RequiredEveryAccountError"));
        return;
      }
    }
    const pairs = accounts.map((a) => `${a.brokerId}:${a.mt5Number.trim()}`);
    if (new Set(pairs).size !== pairs.length) {
      setError(t("duplicateAccountError"));
      return;
    }

    if (!captchaToken) {
      setError(tLogin("completeCaptcha"));
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        accounts: accounts.map((a) => ({ broker_id: a.brokerId, mt5_number: a.mt5Number.trim() })),
        referral_code: referralCode.trim() || undefined,
        // Only matters if this email already has an unexpired pending
        // registration (e.g. we're resubmitting after "Go back") — for a
        // fresh email the backend just ignores it.
        registration_token: registrationToken || undefined,
        captcha_token: captchaToken,
      });
      setOtp("");
      setOtpError("");
      const expiresAt = Date.now() + res.expires_in * 1000;
      const readyAt = Date.now() + RESEND_COOLDOWN_MS;
      setCodeExpiresAt(expiresAt);
      setResendReadyAt(readyAt);
      setRegistrationToken(res.registration_token);
      savePendingOtp({
        email,
        codeExpiresAt: expiresAt,
        resendReadyAt: readyAt,
        registrationToken: res.registration_token,
      });
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("registrationFailed"));
    } finally {
      setLoading(false);
      captchaRef.current?.reset();
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError("");
    setVerifying(true);
    try {
      const token = await authApi.verifyOtp({
        email,
        code: otp.trim(),
        registration_token: registrationToken,
      });
      clearPendingOtp();
      await loginWithToken(token.access_token);
      router.push("/");
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : t("verificationFailed"));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendOtp() {
    setOtpError("");
    setResending(true);
    try {
      const res = await authApi.resendOtp({ email });
      setOtp("");
      const expiresAt = Date.now() + res.expires_in * 1000;
      const readyAt = Date.now() + RESEND_COOLDOWN_MS;
      setCodeExpiresAt(expiresAt);
      setResendReadyAt(readyAt);
      // resend-otp doesn't rotate the registration token, only the code.
      savePendingOtp({ email, codeExpiresAt: expiresAt, resendReadyAt: readyAt, registrationToken });
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : t("resendFailed"));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={`${styles.wrapper} ${!banner ? styles.wrapperSingle : ""}`}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <LogoIcon />
        </div>
        <h1 className={styles.title}>CBFX</h1>

        {step === "otp" ? (
          <>
            <p className={styles.subtitle}>
              {t.rich("otpSubtitle", { email, b: (chunks) => <strong>{chunks}</strong> })}
            </p>

            <form onSubmit={handleVerifyOtp} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="otp">
                  {tAuth("verificationCode")}
                </label>
                <input
                  id="otp"
                  className={`${styles.input} ${styles.otpInput}`}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  placeholder="000000"
                  required
                />
                <span className={styles.hint}>
                  {codeExpired
                    ? tAuth("codeExpired")
                    : tAuth("expiresIn", { time: formatCountdown((codeExpiresAt ?? now) - now) })}
                </span>
              </div>

              {otpError && <p className={styles.errorMsg}>{otpError}</p>}

              <button
                className={styles.submitBtn}
                type="submit"
                disabled={verifying || otp.length !== OTP_LENGTH || codeExpired}
              >
                {verifying ? t("verifying") : t("verifyAndCreate")}
              </button>
            </form>

            <div className={styles.resendRow}>
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResendOtp}
                disabled={resending || !resendReady}
              >
                {resending
                  ? tAuth("sending")
                  : resendReady
                    ? tAuth("resendCode")
                    : tAuth("resendIn", { time: formatCountdown((resendReadyAt ?? now) - now) })}
              </button>
            </div>

            <p className={styles.footer}>
              {tAuth("wrongEmail")}{" "}
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  // Deliberately keep registrationToken (and its
                  // sessionStorage copy) around — resubmitting the form for
                  // the same email needs it to replace this pending
                  // registration instead of being rejected as a possible
                  // hijack of someone else's in-progress signup.
                  setStep("form");
                }}
              >
                {tAuth("goBack")}
              </button>
            </p>
          </>
        ) : (
          <>
        <p className={styles.subtitle}>{t("subtitleCreate")}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="firstName">
                {t("firstName")}
              </label>
              <input
                id="firstName"
                className={styles.input}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lastName">
                {t("lastName")}
              </label>
              <input
                id="lastName"
                className={styles.input}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              {tLogin("email")}
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
              {tLogin("password")}
            </label>
            <input
              id="password"
              type="password"
              className={passwordInvalid ? `${styles.input} ${styles.inputError}` : styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              required
              minLength={8}
              maxLength={MAX_PASSWORD_LENGTH}
              autoComplete="new-password"
            />
            <span className={passwordInvalid ? styles.hintError : styles.hint}>
              {tAuth("passwordHint")}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="referralCode">
              {t("referralCode")} <span className={styles.hint}>{t("optional")}</span>
            </label>
            <input
              id="referralCode"
              className={styles.input}
              placeholder="e.g. A1B2C3D4"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.accountsLabel}>
              {t("brokerAccounts")} <span className={styles.hint}>{t("optional")}</span>
            </span>
            {accounts.length === 0 && (
              <span className={styles.hint}>{t("brokerAccountsHint")}</span>
            )}

            {accounts.map((a, i) => (
              <div key={a.key} className={styles.accountRow}>
                <div className={styles.accountRowHeader}>
                  <span className={styles.accountRowLabel}>{t("accountN", { n: i + 1 })}</span>
                  <button
                    type="button"
                    className={styles.removeAccountBtn}
                    onClick={() => removeAccount(a.key)}
                  >
                    {t("remove")}
                  </button>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`broker-${a.key}`}>
                    {t("broker")}
                  </label>
                  <select
                    id={`broker-${a.key}`}
                    className={styles.select}
                    value={a.brokerId}
                    onChange={(e) => updateAccount(a.key, { brokerId: e.target.value })}
                    required
                    disabled={brokersLoading || brokers.length === 0}
                  >
                    <option value="" disabled>
                      {brokersLoading
                        ? t("loadingBrokers")
                        : brokers.length === 0
                          ? t("noBrokersAvailable")
                          : t("selectBroker")}
                    </option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {t("brokerOption", { name: b.name, rate: b.cashback_rate })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`mt5-${a.key}`}>
                    {t("mt5Number")}
                  </label>
                  <input
                    id={`mt5-${a.key}`}
                    className={styles.input}
                    placeholder={t("mt5Placeholder")}
                    value={a.mt5Number}
                    onChange={(e) => updateAccount(a.key, { mt5Number: e.target.value })}
                    required
                  />
                </div>
              </div>
            ))}

            <button type="button" className={styles.addAccountBtn} onClick={addAccount}>
              {accounts.length === 0 ? t("addBrokerAccount") : t("addAnotherBrokerAccount")}
            </button>
            {accounts.length > 0 && (
              <span className={styles.hint}>{t("multipleAccountsHint")}</span>
            )}
          </div>

          <Recaptcha ref={captchaRef} onChange={setCaptchaToken} />

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? t("creatingAccount") : t("createAccount")}
          </button>
        </form>

        <p className={styles.footer}>
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className={styles.link}>
            {tLogin("signIn")}
          </Link>
        </p>
          </>
        )}
      </div>

      <FeaturedBrokerPanel banner={banner} />
    </div>
  );
}
