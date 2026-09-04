"use client";
import { Fragment, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { copyTradersApi, publicApi, type CopyTrader, type PublicBroker } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./CopyTraders.module.scss";

const STRATEGIES = ["Scalping", "Swing", "Position"] as const;

const STATUS_LABEL_KEYS: Record<
  string,
  "status_not_connected" | "status_pending" | "status_deployed" | "status_connected" | "status_idle" | "status_error"
> = {
  not_connected: "status_not_connected",
  pending: "status_pending",
  deployed: "status_deployed",
  connected: "status_connected",
  idle: "status_idle",
  error: "status_error",
};

export default function AdminCopyTradersPage() {
  const t = useTranslations("adminCopyTraders");
  const [items, setItems] = useState<CopyTrader[]>([]);
  const [brokers, setBrokers] = useState<PublicBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [avatarInitials, setAvatarInitials] = useState("");
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]>("Swing");
  const [pairs, setPairs] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectBrokerId, setConnectBrokerId] = useState("");
  const [connectMt5Number, setConnectMt5Number] = useState("");
  const [connectServer, setConnectServer] = useState("");
  const [connectPlatform, setConnectPlatform] = useState<"mt4" | "mt5">("mt5");
  const [connectPassword, setConnectPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const fetchAll = () => {
    setLoading(true);
    copyTradersApi
      .list()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
    publicApi.brokers().then(setBrokers).catch(() => setBrokers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !avatarInitials.trim()) {
      setCreateError(t("nameRequired"));
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      await copyTradersApi.create({
        name: name.trim(),
        avatar_initials: avatarInitials.trim().toUpperCase().slice(0, 2),
        strategy,
        pairs: pairs
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      });
      setName("");
      setAvatarInitials("");
      setPairs("");
      setStrategy("Swing");
      setShowForm(false);
      fetchAll();
    } catch (ex: unknown) {
      setCreateError(ex instanceof Error ? ex.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (trader: CopyTrader) => {
    if (!confirm(t("deleteConfirm", { name: trader.name }))) return;
    try {
      await copyTradersApi.remove(trader.id);
      setItems((prev) => prev.filter((it) => it.id !== trader.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
    }
  };

  const openConnectForm = (trader: CopyTrader) => {
    setConnectingId(trader.id);
    setConnectBrokerId(trader.broker_id || "");
    setConnectMt5Number(trader.mt5_number || "");
    setConnectServer("");
    setConnectPlatform("mt5");
    setConnectPassword("");
    setConnectError("");
  };

  const closeConnectForm = () => {
    setConnectingId(null);
    setConnectError("");
  };

  const handleConnect = async (traderId: string) => {
    if (!connectBrokerId) {
      setConnectError(t("selectBrokerError"));
      return;
    }
    if (!connectMt5Number.trim() || !connectServer.trim() || !connectPassword.trim()) {
      setConnectError(t("fieldsRequiredError"));
      return;
    }
    setConnecting(true);
    setConnectError("");
    try {
      const updated = await copyTradersApi.connectLive(traderId, {
        broker_id: connectBrokerId,
        mt5_number: connectMt5Number.trim(),
        server: connectServer.trim(),
        platform: connectPlatform,
        investor_password: connectPassword,
      });
      setItems((prev) => prev.map((it) => (it.id === traderId ? updated : it)));
      setConnectingId(null);
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : t("connectFailed"));
    } finally {
      setConnecting(false);
    }
  };

  const statusBadgeClass = (trader: CopyTrader) => {
    if (trader.is_live) return styles.badgeLive;
    if (trader.metaapi_connection_status === "error") return styles.badgeError;
    return styles.badgeNeutral;
  };

  const statusLabel = (trader: CopyTrader) =>
    trader.is_live
      ? t("live")
      : t(STATUS_LABEL_KEYS[trader.metaapi_connection_status] ?? "status_not_connected");

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("addTrader")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("newTrader")}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("name")}</label>
                <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("avatarInitials")}</label>
                <input
                  className={styles.input}
                  value={avatarInitials}
                  onChange={(e) => setAvatarInitials(e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("strategy")}</label>
                <select
                  className={styles.input}
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as (typeof STRATEGIES)[number])}
                >
                  {STRATEGIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("pairs")}</label>
                <input
                  className={styles.input}
                  placeholder="EUR/USD, XAU/USD"
                  value={pairs}
                  onChange={(e) => setPairs(e.target.value)}
                />
              </div>
            </div>
            {createError && <p className={styles.error}>{createError}</p>}
            <button className={styles.submitBtn} type="submit" disabled={creating}>
              {creating ? t("creating") : t("createTrader")}
            </button>
          </form>
        </Card>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("strategy")}</th>
                <th>{t("roi12m")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    {t("none")}
                  </td>
                </tr>
              ) : (
                items.map((trader) => (
                  <Fragment key={trader.id}>
                    <tr>
                      <td>{trader.name}</td>
                      <td>{trader.strategy}</td>
                      <td>{trader.roi_12m}%</td>
                      <td>
                        <span className={`${styles.badge} ${statusBadgeClass(trader)}`}>{statusLabel(trader)}</span>
                      </td>
                      <td className={styles.actions}>
                        {connectingId === trader.id ? (
                          <button className={styles.connectBtn} onClick={closeConnectForm}>
                            {t("cancel")}
                          </button>
                        ) : (
                          !trader.is_live && (
                            <button className={styles.connectBtn} onClick={() => openConnectForm(trader)}>
                              {t("connectLive")}
                            </button>
                          )
                        )}
                        <button className={styles.deleteBtn} onClick={() => handleDelete(trader)}>
                          {t("delete")}
                        </button>
                      </td>
                    </tr>
                    {connectingId === trader.id && (
                      <tr>
                        <td colSpan={5}>
                          <p className={styles.hint}>{t("connectHint")}</p>
                          <div className={styles.connectForm}>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("broker")}</label>
                              <select
                                className={styles.input}
                                value={connectBrokerId}
                                onChange={(e) => setConnectBrokerId(e.target.value)}
                              >
                                <option value="">{t("selectBroker")}</option>
                                {brokers.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("mt5Number")}</label>
                              <input
                                className={styles.input}
                                value={connectMt5Number}
                                onChange={(e) => setConnectMt5Number(e.target.value)}
                              />
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("server")}</label>
                              <input
                                className={styles.input}
                                value={connectServer}
                                onChange={(e) => setConnectServer(e.target.value)}
                              />
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("platform")}</label>
                              <select
                                className={styles.input}
                                value={connectPlatform}
                                onChange={(e) => setConnectPlatform(e.target.value as "mt4" | "mt5")}
                              >
                                <option value="mt5">MT5</option>
                                <option value="mt4">MT4</option>
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>{t("investorPassword")}</label>
                              <input
                                className={styles.input}
                                type="password"
                                value={connectPassword}
                                onChange={(e) => setConnectPassword(e.target.value)}
                              />
                            </div>
                            {connectError && <p className={styles.error}>{connectError}</p>}
                            <button
                              className={styles.submitBtn}
                              disabled={connecting}
                              onClick={() => handleConnect(trader.id)}
                            >
                              {connecting ? t("connecting") : t("confirmConnect")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
