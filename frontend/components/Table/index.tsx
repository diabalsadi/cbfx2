"use client";

// Next
// import dynamic from "next/dynamic";
// React
import { useMemo, useState } from "react";
// Libraries
import Papa from "papaparse";
// Styles
import styles from "./Table.module.scss";
import cx from "classnames";
// Icons
import SortIcon from "@/assets/icons/sortIcon.svg";
import ExportIcon from "@/assets/icons/exportIcon.svg";
// Components
import DropownFilter from "../DropownFilter";
import SearchInput from "../SearchInput";
import DateFilter from "../DateFilter";
import Pagination from "../Pagination";
import StatusLabel from "../StatusLabel";

const COMPONENTS_MAP: Record<string, React.ComponentType<any>> = {
    StatusLabel,
};

/* ---------------------------------- */
/* Types */
/* ---------------------------------- */

interface Column {
    key: string;
    label: string;
    component?: keyof typeof COMPONENTS_MAP;
    isSortable?: boolean;
}

interface ITableProps {
    data: any[];
    columns: Column[];
    isPaginated?: boolean;
    canBeExported?: boolean;
    headerClass?: string;
    searchConfig?: {
        searchable: boolean;
        searchPlaceholder?: string;
        searchKey: string;
    };
    filterConfig?: {
        filters: {
            key: string;
            type: "select" | "date";
            label: string;
            icon?: string;
            options: { value: string; label: string }[];
        }[];
    };
    paginationConfig?: {
        pageSize: number;
        currentPage: number;
    };
    containerClass?: string;
    tableClass?: string;
    bodyClass?: string;
}

/* ---------------------------------- */
/* Component */
/* ---------------------------------- */

const Table = ({
    data,
    columns,
    searchConfig,
    filterConfig,
    paginationConfig,
    canBeExported,
    isPaginated = true,
    headerClass,
    containerClass,
    tableClass,
    bodyClass,
}: ITableProps) => {
    const [searchFilter, setSearchFilter] = useState("");
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    const [currentPage, setCurrentPage] = useState(
        paginationConfig?.currentPage ?? 1
    );
    const [pageSize, setPageSize] = useState(
        paginationConfig?.pageSize ?? 10
    );
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    /* ---------------------------------- */
    /* Dynamic component registry */
    /* ---------------------------------- */

    /* ---------------------------------- */
    /* Dynamic component registry */
    /* ---------------------------------- */

    // const componentRegistry = useMemo<ComponentRegistry>(() => ({
    //     StatusLabel: dynamic(() => import("../StatusLabel"), {
    //         ssr: false,
    //         loading: () => <span>Loading...</span>,
    //     }),
    // }), []);

    /* ---------------------------------- */
    /* Sorting */
    /* ---------------------------------- */

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    /* ---------------------------------- */
    /* Data processing (filter → sort → paginate) */
    /* ---------------------------------- */

    const processedData = useMemo(() => {
        let result = [...data];

        // Search
        if (searchConfig?.searchable && searchFilter) {
            result = result.filter(row =>
                row?.[searchConfig.searchKey]
                    ?.toString()
                    .toLowerCase()
                    .includes(searchFilter.toLowerCase())
            );
        }

        // Filters
        Object.entries(filterValues).forEach(([key, value]) => {
            if (value) {
                result = result.filter(row => row[key] === value);
            }
        });

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                const aVal = a[sortKey]?.toString() ?? "";
                const bVal = b[sortKey]?.toString() ?? "";
                return sortDirection === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            });
        }

        // Pagination
        if (isPaginated) {
            result = result.slice(
                (currentPage - 1) * pageSize,
                currentPage * pageSize
            );
        }

        return result;
    }, [
        data,
        searchFilter,
        searchConfig,
        filterValues,
        sortKey,
        sortDirection,
        currentPage,
        pageSize,
        isPaginated,
    ]);

    /* ---------------------------------- */
    /* Export */
    /* ---------------------------------- */

    const exportData = () => {
        const selectedData = data.filter(row =>
            selectedRows.includes(row.id)
        );

        const csvData = selectedData.map(row => {
            const out: Record<string, any> = {};
            columns.forEach(col => {
                out[col.label] = row[col.key];
            });
            return out;
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "data.csv";
        link.click();
    };

    /* ---------------------------------- */
    /* Render */
    /* ---------------------------------- */

    return (
        <div className={cx(styles.container, containerClass)}>
            {/* Header */}
            {filterConfig?.filters && (
                <div className={styles.header}>
                    <div className={styles.filterWrappers}>
                        {searchConfig?.searchable && (
                            <SearchInput
                                placeholder={
                                    searchConfig.searchPlaceholder ?? "Search"
                                }
                                onChange={(e) =>
                                    setSearchFilter(e.target.value)
                                }
                            />
                        )}

                        <div className={styles.filterWrapper}>
                            {filterConfig.filters.map(filter => {
                                if (filter.type === "select") {
                                    return (
                                        <DropownFilter
                                            key={filter.key}
                                            label={filter.label}
                                            options={filter.options}
                                            value={
                                                filterValues[filter.key] ?? ""
                                            }
                                            icon={filter.icon}
                                            onChange={value =>
                                                setFilterValues(v => ({
                                                    ...v,
                                                    [filter.key]: value,
                                                }))
                                            }
                                        />
                                    );
                                }

                                return (
                                    <DateFilter
                                        key={filter.key}
                                        label={filter.label}
                                        icon={filter.icon}
                                        onChange={value =>
                                            setFilterValues(v => ({
                                                ...v,
                                                [filter.key]: value,
                                            }))
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {canBeExported && selectedRows.length > 0 && (
                        <button
                            className={styles.exportButton}
                            onClick={exportData}
                        >
                            <ExportIcon /> Export
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            <table className={cx(styles.table, tableClass)}>
                <thead className={cx(styles.tableHead, headerClass)}>
                    <tr className={styles.tableRow}>
                        {canBeExported && (
                            <th className={styles.tableHeader}>
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedRows.length === data.length &&
                                        data.length > 0
                                    }
                                    onChange={(e) =>
                                        setSelectedRows(
                                            e.target.checked
                                                ? data.map(row => row.id)
                                                : []
                                        )
                                    }
                                />
                            </th>
                        )}

                        {columns.map(col => (
                            <th
                                key={col.key}
                                className={styles.tableHeader}
                            >
                                <div className={styles.tableHeaderContent}>
                                    {col.label}
                                    {col.isSortable && (
                                        <span
                                            className={cx(styles.sortIcon, {
                                                [styles.desc]:
                                                    sortKey === col.key &&
                                                    sortDirection === "desc",
                                            })}
                                            onClick={() =>
                                                handleSort(col.key)
                                            }
                                        >
                                            <SortIcon />
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className={cx(styles.tableBody, bodyClass)}>
                    {processedData.map((row, index) => (
                        <tr
                            key={`${row.id}-${index}`}
                            className={styles.tableRow}
                        >
                            {canBeExported && (
                                <td className={styles.tableCell}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.includes(row.id)}
                                        onChange={(e) =>
                                            setSelectedRows(prev =>
                                                e.target.checked
                                                    ? [...prev, row.id]
                                                    : prev.filter(
                                                        id => id !== row.id
                                                    )
                                            )
                                        }
                                    />
                                </td>
                            )}

                            {columns.map(col => {
                                const Cell =
                                    col.component &&
                                    COMPONENTS_MAP[col.component];

                                return (
                                    <td
                                        key={`${row.id}-${col.key}`}
                                        className={styles.tableCell}
                                    >
                                        {Cell ? (
                                            <Cell data={row} />
                                        ) : (
                                            row[col.key]
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {isPaginated && (
                <div className={styles.paginationWrapper}>
                    <div className={styles.paginationInfo}>
                        Rows per page{" "}
                        <DropownFilter
                            className={styles.selectOption}
                            options={[
                                { value: "10", label: "10" },
                                { value: "20", label: "20" },
                                { value: "50", label: "50" },
                                { value: "100", label: "100" },
                            ]}
                            value={pageSize}
                            label=""
                            onChange={value =>
                                setPageSize(Number(value))
                            }
                        />{" "}
                        of {data.length}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(data.length / pageSize)}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

/* ---------------------------------- */
/* Registry type */
/* ---------------------------------- */

// type ComponentRegistry = {
//     StatusLabel: React.ComponentType<{ data: any }>;
// };

export default Table;
