"use client";
import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, type BrokerAccountType, type InstrumentCashback } from "@/helpers/api";
import { REGIONS, REGION_LABELS } from "@/helpers/regions";
import { COUNTRIES, COUNTRY_LABELS } from "@/helpers/countries";
import { INSTRUMENT_CATEGORIES } from "@/helpers/instrumentCategories";
import Card from "@/components/Card";
import styles from "./Brokers.module.scss";

export interface Broker {
  id: string;
  name: string;
  img_src: string | null;
  coverage_type: "region" | "country";
  geo_coverage: string[];
  cashback_rate: number;
  referral_id: string | null;
  signup_url: string | null;
  account_types: BrokerAccountType[];
  terms_text: string | null;
  payout_destination: "wallet" | "trading_account";
  payout_duration_days: number | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["active", "inactive"] as const;
const PAYOUT_DESTINATIONS = ["wallet", "trading_account"] as const;

const EMPTY_FORM = {
  name: "",
  img_src: "",
  coverage_type: "region" as "region" | "country",
  geo_coverage: [] as string[],
  cashback_rate: "",
  referral_id: "",
  signup_url: "",
  account_types: [] as BrokerAccountType[],
  terms_text: "",
  payout_destination: "wallet" as "wallet" | "trading_account",
  payout_duration_days: "",
  status: "active",
};

function coverageLabel(coverageType: string, code: string) {
  return coverageType === "country"
    ? COUNTRY_LABELS[code] || code
    : REGION_LABELS[code] || code;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function BrokersAdminPage() {
  const t = useTranslations("adminBrokers");
  const locale = useLocale();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!countryDropdownOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target as Node)
      ) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [countryDropdownOpen]);

  const fetchBrokers = () => {
    setLoading(true);
    api
      .get<Broker[]>("/brokers/")
      .then(setBrokers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBrokers();
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (broker: Broker) => {
    setEditingId(broker.id);
    setFormData({
      name: broker.name,
      img_src: broker.img_src || "",
      coverage_type: broker.coverage_type || "region",
      geo_coverage: broker.geo_coverage,
      cashback_rate: String(broker.cashback_rate),
      referral_id: broker.referral_id || "",
      signup_url: broker.signup_url || "",
      account_types: broker.account_types || [],
      terms_text: broker.terms_text || "",
      payout_destination: broker.payout_destination || "wallet",
      payout_duration_days:
        broker.payout_duration_days != null ? String(broker.payout_duration_days) : "",
      status: broker.status,
    });
    setFormError("");
    setShowForm(true);
  };

  const addAccountType = () => {
    setFormData((v) => ({
      ...v,
      account_types: [...v.account_types, { name: "", description: null, cashback: [] }],
    }));
  };

  const removeAccountType = (index: number) => {
    setFormData((v) => ({
      ...v,
      account_types: v.account_types.filter((_, i) => i !== index),
    }));
  };

  const updateAccountType = (index: number, patch: Partial<BrokerAccountType>) => {
    setFormData((v) => ({
      ...v,
      account_types: v.account_types.map((at, i) => (i === index ? { ...at, ...patch } : at)),
    }));
  };

  const addInstrumentRate = (accountTypeIndex: number) => {
    updateAccountType(accountTypeIndex, {
      cashback: [
        ...formData.account_types[accountTypeIndex].cashback,
        { category: INSTRUMENT_CATEGORIES[0], symbol: null, rate: 0 },
      ],
    });
  };

  const removeInstrumentRate = (accountTypeIndex: number, rateIndex: number) => {
    updateAccountType(accountTypeIndex, {
      cashback: formData.account_types[accountTypeIndex].cashback.filter(
        (_, i) => i !== rateIndex,
      ),
    });
  };

  const updateInstrumentRate = (
    accountTypeIndex: number,
    rateIndex: number,
    patch: Partial<InstrumentCashback>,
  ) => {
    updateAccountType(accountTypeIndex, {
      cashback: formData.account_types[accountTypeIndex].cashback.map((c, i) =>
        i === rateIndex ? { ...c, ...patch } : c,
      ),
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setCountrySearch("");
    setCountryDropdownOpen(false);
  };

  const setCoverageType = (coverage_type: "region" | "country") => {
    setFormData((v) =>
      v.coverage_type === coverage_type ? v : { ...v, coverage_type, geo_coverage: [] },
    );
  };

  const toggleRegion = (region: string) => {
    setFormData((v) => ({
      ...v,
      geo_coverage: v.geo_coverage.includes(region)
        ? v.geo_coverage.filter((r) => r !== region)
        : [...v.geo_coverage, region],
    }));
  };

  const toggleCountry = (code: string) => {
    setFormData((v) => ({
      ...v,
      geo_coverage: v.geo_coverage.includes(code)
        ? v.geo_coverage.filter((c) => c !== code)
        : [...v.geo_coverage, code],
    }));
  };

  const filteredCountries = COUNTRIES.filter((c) =>
    c.label.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError(t("nameRequired"));
      return;
    }
    if (formData.geo_coverage.length === 0) {
      setFormError(
        formData.coverage_type === "country"
          ? t("selectAtLeastOneCountry")
          : t("selectAtLeastOneRegion"),
      );
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        img_src: formData.img_src || null,
        coverage_type: formData.coverage_type,
        geo_coverage: formData.geo_coverage,
        cashback_rate: formData.cashback_rate
          ? parseFloat(formData.cashback_rate)
          : 0,
        referral_id: formData.referral_id || null,
        signup_url: formData.signup_url || null,
        account_types: formData.account_types
          .filter((at) => at.name.trim())
          .map((at) => ({
            ...at,
            cashback: at.cashback.filter((c) => c.category || (c.symbol && c.symbol.trim())),
          })),
        terms_text: formData.terms_text || null,
        payout_destination: formData.payout_destination,
        payout_duration_days: formData.payout_duration_days
          ? parseInt(formData.payout_duration_days, 10)
          : null,
        status: formData.status,
      };
      if (editingId) {
        await api.put(`/brokers/${editingId}`, payload);
      } else {
        await api.post("/brokers/", payload);
      }
      closeForm();
      fetchBrokers();
    } catch (ex: unknown) {
      setFormError(ex instanceof Error ? ex.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await api.delete(`/brokers/${id}`);
      setBrokers((prev) => prev.filter((b) => b.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
    }
  };

  const statusBadge = (s: string) =>
    `${styles.badge} ${s === "active" ? styles.active : styles.inactive}`;

  const statusLabel = (s: string) => (s === "active" ? t("statusActive") : t("statusInactive"));

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => (showForm ? closeForm() : openCreateForm())}
        >
          {showForm ? t("cancel") : t("addBroker")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {editingId ? t("editBroker") : t("newBroker")}
          </h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("name")}</label>
                <input
                  className={styles.input}
                  placeholder={t("namePlaceholder")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("cashbackRate")}</label>
                <div className={styles.percentInputWrap}>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder={t("cashbackPlaceholder")}
                    value={formData.cashback_rate}
                    onChange={(e) =>
                      setFormData((v) => ({
                        ...v,
                        cashback_rate: e.target.value,
                      }))
                    }
                  />
                  <span className={styles.percentSuffix}>%</span>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("imageUrl")}</label>
              <div className={styles.imgPreviewRow}>
                {formData.img_src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.img_src}
                    alt=""
                    className={styles.imgPreview}
                  />
                )}
                <input
                  className={styles.input}
                  placeholder={t("imageUrlPlaceholder")}
                  value={formData.img_src}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, img_src: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("referralId")}</label>
                <input
                  className={styles.input}
                  placeholder={t("referralIdPlaceholder")}
                  value={formData.referral_id}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, referral_id: e.target.value }))
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("signupUrl")}</label>
                <input
                  className={styles.input}
                  placeholder={t("signupUrlPlaceholder")}
                  value={formData.signup_url}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, signup_url: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("payoutDestination")}</label>
                <select
                  className={styles.input}
                  value={formData.payout_destination}
                  onChange={(e) =>
                    setFormData((v) => ({
                      ...v,
                      payout_destination: e.target.value as "wallet" | "trading_account",
                    }))
                  }
                >
                  {PAYOUT_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d === "wallet" ? t("payoutWallet") : t("payoutTradingAccount")}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("payoutDurationDays")}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  placeholder={t("payoutDurationPlaceholder")}
                  value={formData.payout_duration_days}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, payout_duration_days: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("termsText")}</label>
              <textarea
                className={styles.textarea}
                placeholder={t("termsPlaceholder")}
                rows={3}
                value={formData.terms_text}
                onChange={(e) =>
                  setFormData((v) => ({ ...v, terms_text: e.target.value }))
                }
              />
            </div>

            <div className={styles.field}>
              <div className={styles.accountTypesHeader}>
                <label className={styles.label}>{t("accountTypes")}</label>
                <button type="button" className={styles.addSmallBtn} onClick={addAccountType}>
                  {t("addAccountType")}
                </button>
              </div>
              <p className={styles.hint}>{t("accountTypesHint")}</p>

              {formData.account_types.map((at, atIndex) => (
                <Card key={atIndex} className={styles.accountTypeCard}>
                  <div className={styles.accountTypeRow}>
                    <input
                      className={styles.input}
                      placeholder={t("accountTypeNamePlaceholder")}
                      value={at.name}
                      onChange={(e) => updateAccountType(atIndex, { name: e.target.value })}
                    />
                    <button
                      type="button"
                      className={styles.removeSmallBtn}
                      onClick={() => removeAccountType(atIndex)}
                    >
                      {t("remove")}
                    </button>
                  </div>
                  <input
                    className={styles.input}
                    placeholder={t("accountTypeDescriptionPlaceholder")}
                    value={at.description || ""}
                    onChange={(e) =>
                      updateAccountType(atIndex, { description: e.target.value })
                    }
                  />

                  <div className={styles.cashbackList}>
                    {at.cashback.map((c, cIndex) => {
                      const mode: "category" | "symbol" = c.symbol ? "symbol" : "category";
                      return (
                        <div key={cIndex} className={styles.cashbackRow}>
                          <select
                            className={styles.input}
                            value={mode}
                            onChange={(e) =>
                              updateInstrumentRate(
                                atIndex,
                                cIndex,
                                e.target.value === "symbol"
                                  ? { category: null, symbol: "" }
                                  : { category: INSTRUMENT_CATEGORIES[0], symbol: null },
                              )
                            }
                          >
                            <option value="category">{t("byCategory")}</option>
                            <option value="symbol">{t("bySymbolOverride")}</option>
                          </select>
                          {mode === "category" ? (
                            <select
                              className={styles.input}
                              value={c.category ?? INSTRUMENT_CATEGORIES[0]}
                              onChange={(e) =>
                                updateInstrumentRate(atIndex, cIndex, { category: e.target.value })
                              }
                            >
                              {INSTRUMENT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {t(`categories.${cat}`)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className={styles.input}
                              placeholder={t("instrumentPlaceholder")}
                              value={c.symbol ?? ""}
                              onChange={(e) =>
                                updateInstrumentRate(atIndex, cIndex, { symbol: e.target.value })
                              }
                            />
                          )}
                          <div className={styles.percentInputWrap}>
                            <input
                              className={styles.input}
                              type="number"
                              step="0.01"
                              min="0"
                              value={c.rate}
                              onChange={(e) =>
                                updateInstrumentRate(atIndex, cIndex, {
                                  rate: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                            <span className={styles.percentSuffix}>{t("perLot")}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.removeSmallBtn}
                            onClick={() => removeInstrumentRate(atIndex, cIndex)}
                          >
                            {t("remove")}
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.addSmallBtn}
                      onClick={() => addInstrumentRate(atIndex)}
                    >
                      {t("addInstrumentRate")}
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("geoCoverage")}</label>
              <div className={styles.coverageModeToggle}>
                <button
                  type="button"
                  className={`${styles.coverageModeBtn} ${
                    formData.coverage_type === "region" ? styles.coverageModeBtnActive : ""
                  }`}
                  onClick={() => setCoverageType("region")}
                >
                  {t("byRegion")}
                </button>
                <button
                  type="button"
                  className={`${styles.coverageModeBtn} ${
                    formData.coverage_type === "country" ? styles.coverageModeBtnActive : ""
                  }`}
                  onClick={() => setCoverageType("country")}
                >
                  {t("byCountry")}
                </button>
              </div>

              {formData.coverage_type === "region" ? (
                <div className={styles.regionChips}>
                  {REGIONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      className={`${styles.regionChip} ${
                        formData.geo_coverage.includes(r.value)
                          ? styles.regionChipActive
                          : ""
                      }`}
                      onClick={() => toggleRegion(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.countryPicker} ref={countryDropdownRef}>
                  <button
                    type="button"
                    className={styles.countryDropdownTrigger}
                    onClick={() => setCountryDropdownOpen((o) => !o)}
                  >
                    {formData.geo_coverage.length
                      ? t("countriesSelected", { count: formData.geo_coverage.length })
                      : t("selectCountries")}
                    <span className={styles.countryDropdownCaret}>▾</span>
                  </button>

                  {countryDropdownOpen && (
                    <div className={styles.countryDropdownPanel}>
                      <input
                        className={styles.countryDropdownSearch}
                        placeholder={t("searchCountries")}
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.countryDropdownList}>
                        {filteredCountries.length === 0 ? (
                          <div className={styles.countryDropdownEmpty}>{t("noMatches")}</div>
                        ) : (
                          filteredCountries.map((c) => (
                            <label key={c.value} className={styles.countryOption}>
                              <input
                                type="checkbox"
                                checked={formData.geo_coverage.includes(c.value)}
                                onChange={() => toggleCountry(c.value)}
                              />
                              {c.label}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {formData.geo_coverage.length > 0 && (
                    <div className={styles.regionChips}>
                      {formData.geo_coverage.map((code) => (
                        <button
                          type="button"
                          key={code}
                          className={`${styles.regionChip} ${styles.regionChipActive}`}
                          onClick={() => toggleCountry(code)}
                          title={t("remove")}
                        >
                          {COUNTRY_LABELS[code] || code} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t("status")}</label>
              <select
                className={styles.input}
                value={formData.status}
                onChange={(e) =>
                  setFormData((v) => ({ ...v, status: e.target.value }))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {formError && <p className={styles.error}>{formError}</p>}
            <div className={styles.formActions}>
              <button
                className={styles.submitBtn}
                type="submit"
                disabled={saving}
              >
                {saving
                  ? t("saving")
                  : editingId
                    ? t("saveChanges")
                    : t("createBroker")}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeForm}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        </Card>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <Card className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("broker")}</th>
                <th>{t("coverage")}</th>
                <th>{t("cashback")}</th>
                <th>{t("referralId")}</th>
                <th>{t("status")}</th>
                <th>{t("added")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : brokers.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {t("noBrokers")}
                  </td>
                </tr>
              ) : (
                brokers.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className={styles.brokerCell}>
                        {b.img_src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.img_src}
                            alt=""
                            className={styles.brokerAvatar}
                          />
                        ) : (
                          <div className={styles.brokerAvatarFallback}>
                            {getInitials(b.name)}
                          </div>
                        )}
                        <span className={styles.brokerName}>{b.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.regionList}>
                        {b.geo_coverage.map((r) => (
                          <span key={r} className={styles.regionTag}>
                            {coverageLabel(b.coverage_type, r)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.rate}>{b.cashback_rate}%</td>
                    <td className={styles.referralId}>
                      {b.referral_id || "—"}
                    </td>
                    <td>
                      <span className={statusBadge(b.status)}>
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    <td className={styles.date}>
                      {new Date(b.created_at).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => openEditForm(b)}
                        >
                          {t("edit")}
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(b.id)}
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
