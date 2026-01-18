"use client";

import { useState } from "react";

interface SQLOutputProps {
  sql: string | null;
  isGenerating: boolean;
  streamingSQL: string;
}

export default function SQLOutput({ sql, isGenerating, streamingSQL }: SQLOutputProps) {
  const [copied, setCopied] = useState(false);

  const displaySQL = isGenerating ? streamingSQL : sql;

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

  if (!displaySQL && !isGenerating) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Generated SQL</h2>
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

      <div className="relative">
        <pre className="bg-neutral-900 dark:bg-neutral-950 text-neutral-100 rounded-lg p-4 overflow-x-auto font-mono text-sm leading-relaxed">
          <code>
            <SQLHighlighted sql={displaySQL || ""} />
          </code>
          {isGenerating && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
          )}
        </pre>
      </div>
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
