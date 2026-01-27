"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { validateSQL } from "../utils/sqlValidator";

interface SQLOutputProps {
  sql: string | null;
  explanation?: string | null;
  isGenerating: boolean;
  streamingSQL: string;
  onNewQuery?: () => void;
  getShareableURL?: () => string;
}

export default function SQLOutput({ sql, explanation, isGenerating, streamingSQL, onNewQuery, getShareableURL }: SQLOutputProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const prevGeneratingRef = useRef(isGenerating);

  const displaySQL = isGenerating ? streamingSQL : sql;

  // Validate SQL (only when not generating)
  const validation = useMemo(() => {
    if (isGenerating || !sql) return null;
    return validateSQL(sql);
  }, [sql, isGenerating]);

  // Track completion for pulse animation
  useEffect(() => {
    if (prevGeneratingRef.current && !isGenerating && sql) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 1500);
      return () => clearTimeout(timer);
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, sql]);

  const copyToClipboard = async () => {
    if (!displaySQL) return;

    try {
      await navigator.clipboard.writeText(displaySQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = displaySQL;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyShareableURL = async () => {
    if (!getShareableURL) return;
    const url = getShareableURL();

    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  if (!displaySQL && !isGenerating) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Generated SQL</h2>
          {validation && !isGenerating && (
            <span
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                validation.valid && !validation.warning
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : validation.valid && validation.warning
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}
              title={validation.warning || "Valid SQL"}
            >
              {validation.valid && !validation.warning ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valid
                </>
              ) : validation.valid && validation.warning ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {validation.warning}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {validation.warning}
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {displaySQL && !isGenerating && onNewQuery && (
            <button
              onClick={onNewQuery}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New query
            </button>
          )}
          {displaySQL && !isGenerating && getShareableURL && (
            <button
              onClick={copyShareableURL}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {shared ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Link copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          )}
          {displaySQL && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <pre
          className={`bg-neutral-900 dark:bg-neutral-950 text-neutral-100 rounded-lg p-4 overflow-x-auto font-mono text-sm leading-relaxed transition-all duration-300 ${
            justCompleted ? "ring-2 ring-green-500/50" : ""
          }`}
        >
          <code>
            <SQLHighlighted sql={displaySQL || ""} />
          </code>
          {isGenerating && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
          )}
        </pre>
        {justCompleted && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-green-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Done
          </div>
        )}
      </div>

      {/* Explanation */}
      {explanation && !isGenerating && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Explanation</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">{explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple SQL syntax highlighter
function SQLHighlighted({ sql }: { sql: string }) {
  if (!sql) return null;

  // SQL keywords to highlight
  const keywords = [
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN",
    "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "FULL", "CROSS", "ON",
    "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET",
    "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "PRIMARY", "KEY", "FOREIGN", "REFERENCES",
    "AS", "DISTINCT", "ALL", "UNION", "INTERSECT", "EXCEPT",
    "CASE", "WHEN", "THEN", "ELSE", "END",
    "NULL", "IS", "TRUE", "FALSE",
    "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NULLIF",
    "WITH", "RECURSIVE", "EXISTS",
  ];

  // Function names
  const functions = [
    "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NULLIF",
    "CONCAT", "SUBSTRING", "TRIM", "UPPER", "LOWER", "LENGTH",
    "DATE", "NOW", "CURRENT_DATE", "CURRENT_TIMESTAMP", "EXTRACT",
    "CAST", "CONVERT", "ROUND", "FLOOR", "CEIL", "ABS",
  ];

  // Tokenize and highlight
  const tokens: React.ReactNode[] = [];
  let remaining = sql;
  let key = 0;

  while (remaining.length > 0) {
    let matched = false;

    // Check for strings (single quotes)
    if (remaining[0] === "'") {
      const endIdx = remaining.indexOf("'", 1);
      if (endIdx !== -1) {
        const str = remaining.substring(0, endIdx + 1);
        tokens.push(
          <span key={key++} className="text-green-400">
            {str}
          </span>
        );
        remaining = remaining.substring(endIdx + 1);
        matched = true;
      }
    }

    // Check for numbers
    if (!matched) {
      const numMatch = remaining.match(/^(\d+\.?\d*)/);
      if (numMatch) {
        tokens.push(
          <span key={key++} className="text-orange-400">
            {numMatch[1]}
          </span>
        );
        remaining = remaining.substring(numMatch[1].length);
        matched = true;
      }
    }

    // Check for keywords
    if (!matched) {
      for (const kw of keywords) {
        const pattern = new RegExp(`^(${kw})\\b`, "i");
        const match = remaining.match(pattern);
        if (match) {
          const isFunction = functions.includes(kw.toUpperCase());
          tokens.push(
            <span
              key={key++}
              className={isFunction ? "text-yellow-400" : "text-blue-400 font-semibold"}
            >
              {match[1]}
            </span>
          );
          remaining = remaining.substring(match[1].length);
          matched = true;
          break;
        }
      }
    }

    // Check for identifiers (table/column names after FROM, JOIN, etc.)
    if (!matched) {
      const identMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (identMatch) {
        tokens.push(
          <span key={key++} className="text-purple-300">
            {identMatch[1]}
          </span>
        );
        remaining = remaining.substring(identMatch[1].length);
        matched = true;
      }
    }

    // Check for operators and punctuation
    if (!matched) {
      const opMatch = remaining.match(/^([<>=!]+|[,;()*.])/);
      if (opMatch) {
        tokens.push(
          <span key={key++} className="text-neutral-400">
            {opMatch[1]}
          </span>
        );
        remaining = remaining.substring(opMatch[1].length);
        matched = true;
      }
    }

    // Default: consume one character
    if (!matched) {
      tokens.push(
        <span key={key++} className="text-neutral-100">
          {remaining[0]}
        </span>
      );
      remaining = remaining.substring(1);
    }
  }

  return <>{tokens}</>;
}
