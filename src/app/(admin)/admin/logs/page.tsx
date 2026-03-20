"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  targetEntity: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: { id: string; name: string | null; email: string } | null;
}

interface ServerErrorEntry {
  id: string;
  severity: "ERROR" | "WARN" | "FATAL";
  message: string;
  stackTrace: string | null;
  apiPath: string | null;
  httpMethod: string | null;
  statusCode: number | null;
  userId: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMIT = 25;

const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "SETTING_CHANGED",
  "ACCOUNT_STATUS_CHANGED",
] as const;

const SEVERITIES = ["ERROR", "WARN", "FATAL"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminLogsPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "errors">("audit");

  // Audit state
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState("");

  // Server error state
  const [errorEntries, setErrorEntries] = useState<ServerErrorEntry[]>([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorPage, setErrorPage] = useState(1);
  const [errorFilter, setErrorFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "audit") {
        const params = new URLSearchParams({
          page: String(auditPage),
          limit: String(LIMIT),
        });
        if (auditFilter) params.set("action", auditFilter);
        const res = await fetch(`/api/audit-log?${params}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setAuditEntries(data.entries);
        setAuditTotal(data.total);
      } else {
        const params = new URLSearchParams({
          page: String(errorPage),
          limit: String(LIMIT),
        });
        if (errorFilter) params.set("severity", errorFilter);
        const res = await fetch(`/api/server-errors?${params}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setErrorEntries(data.entries);
        setErrorTotal(data.total);
      }
    } catch {
      setError("Logs konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, auditPage, auditFilter, errorPage, errorFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------

  const currentPage = activeTab === "audit" ? auditPage : errorPage;
  const total = activeTab === "audit" ? auditTotal : errorTotal;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  function handleTabChange(tab: "audit" | "errors") {
    setActiveTab(tab);
  }

  function handleAuditFilterChange(value: string) {
    setAuditFilter(value);
    setAuditPage(1);
  }

  function handleErrorFilterChange(value: string) {
    setErrorFilter(value);
    setErrorPage(1);
  }

  function handlePrev() {
    if (activeTab === "audit") {
      setAuditPage((p) => Math.max(1, p - 1));
    } else {
      setErrorPage((p) => Math.max(1, p - 1));
    }
  }

  function handleNext() {
    if (activeTab === "audit") {
      setAuditPage((p) => Math.min(totalPages, p + 1));
    } else {
      setErrorPage((p) => Math.min(totalPages, p + 1));
    }
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  function formatTimestamp(iso: string) {
    return new Date(iso).toLocaleString("de-DE");
  }

  function formatDetails(details: Record<string, unknown> | null) {
    if (!details) return "—";
    return JSON.stringify(details);
  }

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Logs</h1>

      {/* Tab Navigation */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => handleTabChange("audit")}
          className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            activeTab === "audit"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Audit Log
        </button>
        <button
          onClick={() => handleTabChange("errors")}
          className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            activeTab === "errors"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Server-Fehler
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        {activeTab === "audit" ? (
          <select
            value={auditFilter}
            onChange={(e) => handleAuditFilterChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={errorFilter}
            onChange={(e) => handleErrorFilterChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Alle</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading / Error */}
      {loading && <p className="text-sm text-gray-500">Lade Logs...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Audit Log Table */}
      {!loading && !error && activeTab === "audit" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Zeitstempel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aktion</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Akteur</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ziel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auditEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {entry.action}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.actor
                      ? `${entry.actor.name ?? "—"} (${entry.actor.email})`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {entry.targetEntity
                      ? `${entry.targetEntity}${entry.targetId ? ` #${entry.targetId}` : ""}`
                      : "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600" title={formatDetails(entry.details)}>
                    {formatDetails(entry.details)}
                  </td>
                </tr>
              ))}
              {auditEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Keine Einträge vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Server Error Table */}
      {!loading && !error && activeTab === "errors" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Zeitstempel</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Schweregrad</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nachricht</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">API-Pfad</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Statuscode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {errorEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.severity === "FATAL"
                          ? "bg-red-100 text-red-800"
                          : entry.severity === "ERROR"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {entry.severity}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900" title={entry.message}>
                    {entry.message}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {entry.apiPath ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {entry.statusCode ?? "—"}
                  </td>
                </tr>
              ))}
              {errorEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Keine Einträge vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Zurück
          </button>
          <span className="text-sm text-gray-600">
            Seite {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
