"use client";

import { useState } from "react";
import type { GeneratedData, Schema, ExportFormat } from "../types";
import {
  exportAsSQL,
  exportAsJSON,
  exportAllAsCSV,
  exportTableAsSQL,
  exportTableAsJSON,
  exportAsCSV,
  downloadFile,
  copyToClipboard,
} from "../utils/exporters";

interface ExportPanelProps {
  data: GeneratedData;
  schema: Schema;
  isPreview?: boolean;
}

export default function ExportPanel({ data, schema, isPreview }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("sql");
  const [copied, setCopied] = useState(false);
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<string | null>(
    Object.keys(data)[0] || null
  );

  const getExportContent = () => {
    switch (format) {
      case "sql":
        return exportAsSQL(data, schema);
      case "json":
        return exportAsJSON(data);
      case "csv":
        return exportAllAsCSV(data);
      default:
        return "";
    }
  };

  const handleDownload = () => {
    const content = getExportContent();
    const ext = format;
    const mimeType =
      format === "json"
        ? "application/json"
        : format === "csv"
        ? "text/csv"
        : "text/plain";
    downloadFile(content, `data-forge-export.${ext}`, mimeType);
  };

  const handleCopy = async () => {
    await copyToClipboard(getExportContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTableExportContent = (tableName: string) => {
    switch (format) {
      case "sql":
        return exportTableAsSQL(data, schema, tableName);
      case "json":
        return exportTableAsJSON(data, tableName);
      case "csv":
        return exportAsCSV(data, tableName);
      default:
        return "";
    }
  };

  const handleCopyTable = async (tableName: string) => {
    await copyToClipboard(getTableExportContent(tableName));
    setCopiedTable(tableName);
    setTimeout(() => setCopiedTable(null), 2000);
  };

  const tableNames = Object.keys(data);
  const previewData = previewTable ? data[previewTable] || [] : [];
  const previewColumns = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Header with format tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-1" role="tablist" aria-label="Export format">
          {(["sql", "json", "csv"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              role="tab"
              aria-selected={format === f}
              aria-controls="export-preview"
              className={`px-3 py-1.5 text-sm font-medium rounded transition ${
                format === f
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded hover:border-neutral-500 transition"
          >
            {copied ? (
              <>
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:opacity-80 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Data preview */}
      <div className="p-4">
        {/* Preview mode indicator */}
        {isPreview && (
          <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Preview mode: Showing up to 3 rows per table. Generate full data for complete export.
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-neutral-500">Preview:</span>
          <div className="flex gap-1 flex-wrap">
            {tableNames.map((name) => (
              <div key={name} className="flex items-center">
                <button
                  onClick={() => setPreviewTable(name)}
                  className={`px-2 py-1 text-xs font-mono rounded-l transition ${
                    previewTable === name
                      ? "bg-neutral-200 dark:bg-neutral-700"
                      : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {name} ({data[name]?.length || 0})
                </button>
                <button
                  onClick={() => handleCopyTable(name)}
                  className="px-1.5 py-1 text-xs border-l border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-r transition"
                  aria-label={copiedTable === name ? `Copied ${name}` : `Copy ${name} as ${format.toUpperCase()}`}
                >
                  {copiedTable === name ? (
                    <svg
                      className="w-3 h-3 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Table preview */}
        {previewData.length > 0 && (
          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800">
                  {previewColumns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-mono font-medium text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                  >
                    {previewColumns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 font-mono text-xs truncate max-w-[200px]"
                        title={String(row[col])}
                      >
                        {row[col] === null ? (
                          <span className="text-neutral-400">null</span>
                        ) : typeof row[col] === "boolean" ? (
                          <span
                            className={
                              row[col]
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            {String(row[col])}
                          </span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <div className="px-3 py-2 text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                Showing 5 of {previewData.length} rows
              </div>
            )}
          </div>
        )}

        {/* Export preview */}
        <div className="mt-4" id="export-preview" role="tabpanel">
          <div className="text-sm text-neutral-500 mb-2">Export preview:</div>
          <pre className="p-4 bg-neutral-900 dark:bg-neutral-950 text-neutral-100 rounded-lg overflow-x-auto text-xs font-mono max-h-48">
            {getExportContent().slice(0, 1000)}
            {getExportContent().length > 1000 && "\n\n... (truncated)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
