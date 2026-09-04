"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { symbolCategoriesApi, type SymbolCategory } from "@/helpers/api";
import { INSTRUMENT_CATEGORIES as CATEGORIES } from "@/helpers/instrumentCategories";
import Card from "@/components/Card";
import styles from "./SymbolCategories.module.scss";

export default function SymbolCategoriesPage() {
  const t = useTranslations("adminSymbolCategories");
  const tCat = useTranslations("adminSymbolCategories.categories");
  const [items, setItems] = useState<SymbolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newCategory, setNewCategory] = useState<string>(CATEGORIES[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchAll = () => {
    setLoading(true);
    symbolCategoriesApi
      .list()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      setCreateError(t("symbolRequired"));
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      await symbolCategoriesApi.create({ symbol: newSymbol.trim(), category: newCategory });
      setNewSymbol("");
      setNewCategory(CATEGORIES[0]);
      setShowForm(false);
      fetchAll();
    } catch (ex: unknown) {
      setCreateError(ex instanceof Error ? ex.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    setUpdating(id);
    try {
      const updated = await symbolCategoriesApi.update(id, { category });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("updateFailed"));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (item: SymbolCategory) => {
    if (!confirm(t("deleteConfirm", { symbol: item.symbol }))) return;
    try {
      await symbolCategoriesApi.remove(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("deleteFailed"));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("addMapping")}
        </button>
      </div>

      {showForm && (
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("newMapping")}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t("symbol")}</label>
                <input
                  className={styles.input}
                  placeholder={t("symbolPlaceholder")}
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t("category")}</label>
                <select
                  className={styles.input}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {tCat(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {createError && <p className={styles.error}>{createError}</p>}
            <button className={styles.submitBtn} type="submit" disabled={creating}>
              {creating ? t("creating") : t("createMapping")}
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
                <th>{t("symbol")}</th>
                <th>{t("category")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className={styles.empty}>
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.empty}>
                    {t("noMappings")}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id}>
                    <td className={styles.symbol}>{it.symbol}</td>
                    <td>
                      <select
                        className={styles.categorySelect}
                        value={it.category}
                        onChange={(e) => handleCategoryChange(it.id, e.target.value)}
                        disabled={updating === it.id}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {tCat(c)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(it)}>
                        {t("delete")}
                      </button>
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
