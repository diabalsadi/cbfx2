"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSigninBanner } from "@/helpers/useSigninBanner";
import FeaturedBrokerPanel from "@/components/FeaturedBrokerPanel";
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

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const banner = useSigninBanner();

  const [brokers, setBrokers] = useState<PublicBroker[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<AccountDraft[]>([newAccountDraft()]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const updateAccount = (key: string, patch: Partial<AccountDraft>) => {
    setAccounts((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  const addAccount = () => {
    setAccounts((prev) => [...prev, newAccountDraft(brokers.length === 1 ? brokers[0].id : "")]);
  };

  const removeAccount = (key: string) => {
    setAccounts((prev) => (prev.length > 1 ? prev.filter((a) => a.key !== key) : prev));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    for (const a of accounts) {
      if (!a.brokerId) {
        setError("Please select a broker for every account");
        return;
      }
      if (!a.mt5Number.trim()) {
        setError("Every account needs an MT5 number");
        return;
      }
    }
    const pairs = accounts.map((a) => `${a.brokerId}:${a.mt5Number.trim()}`);
    if (new Set(pairs).size !== pairs.length) {
      setError("You've entered the same broker + MT5 number more than once");
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        accounts: accounts.map((a) => ({ broker_id: a.brokerId, mt5_number: a.mt5Number.trim() })),
      });
      await login(email, password, "user");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.wrapper} ${!banner ? styles.wrapperSingle : ""}`}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <LogoIcon />
        </div>
        <h1 className={styles.title}>CBFX</h1>
        <p className={styles.subtitle}>Create your account and link your MT5 account(s)</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="firstName">
                First Name
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
                Last Name
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.accountsLabel}>Broker Accounts</span>

            {accounts.map((a, i) => (
              <div key={a.key} className={styles.accountRow}>
                <div className={styles.accountRowHeader}>
                  <span className={styles.accountRowLabel}>Account {i + 1}</span>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeAccountBtn}
                      onClick={() => removeAccount(a.key)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`broker-${a.key}`}>
                    Broker
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
                        ? "Loading brokers…"
                        : brokers.length === 0
                          ? "No brokers available"
                          : "Select your broker…"}
                    </option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.cashback_rate}% cashback
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`mt5-${a.key}`}>
                    MT5 Account Number
                  </label>
                  <input
                    id={`mt5-${a.key}`}
                    className={styles.input}
                    placeholder="e.g. 50219384"
                    value={a.mt5Number}
                    onChange={(e) => updateAccount(a.key, { mt5Number: e.target.value })}
                    required
                  />
                </div>
              </div>
            ))}

            <button type="button" className={styles.addAccountBtn} onClick={addAccount}>
              + Add another broker account
            </button>
            <span className={styles.hint}>
              You can have more than one MT5 account, even with the same broker.
            </span>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>

      <FeaturedBrokerPanel banner={banner} />
    </div>
  );
}
