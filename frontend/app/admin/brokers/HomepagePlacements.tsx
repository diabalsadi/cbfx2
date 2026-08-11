"use client";
import { useState, useEffect, useCallback } from "react";
import { brokerPlacementsApi, type BrokerSectionKey } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./HomepagePlacements.module.scss";

interface SlotRow {
  position: number;
  broker_id: string;
}

const SECTIONS: { key: BrokerSectionKey; label: string }[] = [
  { key: "featured", label: "Featured Brokers" },
  { key: "sponsored", label: "Sponsored Brokers" },
  { key: "partners", label: "Featured Partners" },
  { key: "more_partners", label: "More Partner Brokers" },
];

const EMPTY_SLOTS: Record<BrokerSectionKey, SlotRow[]> = {
  featured: [],
  sponsored: [],
  partners: [],
  more_partners: [],
};

export default function HomepagePlacements({
  brokers,
}: {
  brokers: { id: string; name: string }[];
}) {
  const [slots, setSlots] =
    useState<Record<BrokerSectionKey, SlotRow[]>>(EMPTY_SLOTS);
  const [error, setError] = useState("");

  const fetchAll = useCallback(() => {
    brokerPlacementsApi
      .list()
      .then((placements) => {
        const grouped: Record<BrokerSectionKey, SlotRow[]> = {
          featured: [],
          sponsored: [],
          partners: [],
          more_partners: [],
        };
        for (const p of placements) {
          grouped[p.section]?.push({
            position: p.position,
            broker_id: p.broker_id,
          });
        }
        (Object.keys(grouped) as BrokerSectionKey[]).forEach((key) => {
          grouped[key].sort((a, b) => a.position - b.position);
        });
        setSlots(grouped);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSelect = async (
    section: BrokerSectionKey,
    position: number,
    brokerId: string,
  ) => {
    if (!brokerId) return;
    try {
      await brokerPlacementsApi.set(section, position, brokerId);
      setSlots((prev) => ({
        ...prev,
        [section]: prev[section].map((row) =>
          row.position === position ? { ...row, broker_id: brokerId } : row,
        ),
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save slot");
    }
  };

  const handleRemove = async (section: BrokerSectionKey, position: number) => {
    try {
      await brokerPlacementsApi.clear(section, position);
      setSlots((prev) => ({
        ...prev,
        [section]: prev[section].filter((row) => row.position !== position),
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove slot");
    }
  };

  const handleAddSlot = (section: BrokerSectionKey) => {
    setSlots((prev) => {
      const existing = prev[section];
      const nextPosition = existing.length
        ? Math.max(...existing.map((r) => r.position)) + 1
        : 1;
      return {
        ...prev,
        [section]: [...existing, { position: nextPosition, broker_id: "" }],
      };
    });
  };

  return (
    <Card className={styles.container}>
      <div>
        <h3 className={styles.title}>Homepage Placement</h3>
        <p className={styles.subtitle}>
          Choose which broker fills each slot in every homepage section.
        </p>
      </div>

      {error && <p>{error}</p>}

      <div className={styles.grid}>
        {SECTIONS.map(({ key, label }) => (
          <div key={key} className={styles.sectionCard}>
            <div className={styles.sectionTitle}>{label}</div>
            <div className={styles.slotList}>
              {slots[key].length === 0 && (
                <div className={styles.empty}>No slots configured.</div>
              )}
              {slots[key].map((row) => (
                <div key={row.position} className={styles.slotRow}>
                  <span className={styles.slotPosition}>{row.position}</span>
                  <select
                    className={styles.slotSelect}
                    value={row.broker_id}
                    onChange={(e) =>
                      handleSelect(key, row.position, e.target.value)
                    }
                  >
                    <option value="">Select broker…</option>
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.slotRemove}
                    onClick={() => handleRemove(key, row.position)}
                    aria-label="Remove slot"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.addSlotBtn}
              onClick={() => handleAddSlot(key)}
            >
              + Add Slot
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
