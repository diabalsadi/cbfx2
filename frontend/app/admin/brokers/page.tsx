"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/helpers/api";
import { REGIONS, REGION_LABELS } from "@/helpers/regions";
import { COUNTRIES, COUNTRY_LABELS } from "@/helpers/countries";
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
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["active", "inactive"];

const EMPTY_FORM = {
  name: "",
  img_src: "",
  coverage_type: "region" as "region" | "country",
  geo_coverage: [] as string[],
  cashback_rate: "",
  referral_id: "",
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
      status: broker.status,
    });
    setFormError("");
    setShowForm(true);
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
      setFormError("Name is required");
      return;
    }
    if (formData.geo_coverage.length === 0) {
      setFormError(
        formData.coverage_type === "country"
          ? "Select at least one country"
          : "Select at least one region",
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
      setFormError(
        ex instanceof Error ? ex.message : "Failed to save broker",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this broker?")) return;
    try {
      await api.delete(`/brokers/${id}`);
      setBrokers((prev) => prev.filter((b) => b.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const statusBadge = (s: string) =>
    `${styles.badge} ${s === "active" ? styles.active : styles.inactive}`;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Brokers</h2>
          <p className={styles.subtitle}>
            Manage broker partners, coverage, and cashback rates.
          </p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => (showForm ? closeForm() : openCreateForm())}
        >
          {showForm ? "Cancel" : "+ Add Broker"}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {editingId ? "Edit Broker" : "New Broker"}
          </h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Name *</label>
                <input
                  className={styles.input}
                  placeholder="Apex Markets"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Cashback Rate</label>
                <div className={styles.percentInputWrap}>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="82.5"
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
              <label className={styles.label}>Image URL</label>
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
                  placeholder="https://example.com/logo.png"
                  value={formData.img_src}
                  onChange={(e) =>
                    setFormData((v) => ({ ...v, img_src: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Referral ID</label>
              <input
                className={styles.input}
                placeholder="e.g. our affiliate/partner code with this broker"
                value={formData.referral_id}
                onChange={(e) =>
                  setFormData((v) => ({ ...v, referral_id: e.target.value }))
                }
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Geolocation Coverage *</label>
              <div className={styles.coverageModeToggle}>
                <button
                  type="button"
                  className={`${styles.coverageModeBtn} ${
                    formData.coverage_type === "region" ? styles.coverageModeBtnActive : ""
                  }`}
                  onClick={() => setCoverageType("region")}
                >
                  By Region
                </button>
                <button
                  type="button"
                  className={`${styles.coverageModeBtn} ${
                    formData.coverage_type === "country" ? styles.coverageModeBtnActive : ""
                  }`}
                  onClick={() => setCoverageType("country")}
                >
                  By Country
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
                      ? `${formData.geo_coverage.length} countr${
                          formData.geo_coverage.length === 1 ? "y" : "ies"
                        } selected`
                      : "Select countries…"}
                    <span className={styles.countryDropdownCaret}>▾</span>
                  </button>

                  {countryDropdownOpen && (
                    <div className={styles.countryDropdownPanel}>
                      <input
                        className={styles.countryDropdownSearch}
                        placeholder="Search countries…"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        autoFocus
                      />
                      <div className={styles.countryDropdownList}>
                        {filteredCountries.length === 0 ? (
                          <div className={styles.countryDropdownEmpty}>No matches</div>
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
                          title="Remove"
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
              <label className={styles.label}>Status</label>
              <select
                className={styles.input}
                value={formData.status}
                onChange={(e) =>
                  setFormData((v) => ({ ...v, status: e.target.value }))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
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
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Create Broker"}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeForm}
              >
                Cancel
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
                <th>Broker</th>
                <th>Coverage</th>
                <th>Cashback</th>
                <th>Referral ID</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Loading…
                  </td>
                </tr>
              ) : brokers.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No brokers yet. Add your first one.
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
                        {b.status}
                      </span>
                    </td>
                    <td className={styles.date}>
                      {new Date(b.created_at).toLocaleDateString("en-US", {
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
                          Edit
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(b.id)}
                        >
                          Delete
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
