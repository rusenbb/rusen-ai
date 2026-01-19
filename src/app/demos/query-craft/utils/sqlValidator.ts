// Simple regex-based SQL validation (no dependencies)
// This provides basic structure validation without a full parser

interface ValidationResult {
  valid: boolean;
  warning?: string;
}

export function validateSQL(sql: string): ValidationResult {
  if (!sql || !sql.trim()) {
    return { valid: false, warning: "Empty query" };
  }

  const trimmed = sql.trim();

  // Check for valid SQL start keywords
  const validStartKeywords = /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP|TRUNCATE|MERGE|EXPLAIN|SHOW|DESCRIBE)/i;
  if (!validStartKeywords.test(trimmed)) {
    return { valid: false, warning: "Query should start with a SQL keyword" };
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of trimmed) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (parenCount < 0) {
      return { valid: false, warning: "Unbalanced parentheses" };
    }
  }
  if (parenCount !== 0) {
    return { valid: false, warning: "Unbalanced parentheses" };
  }

  // Check for unclosed string literals (basic check)
  const singleQuotes = (trimmed.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    return { valid: false, warning: "Unclosed string literal" };
  }

  // Check ends with semicolon (warning only, not error)
  if (!trimmed.endsWith(";")) {
    return { valid: true, warning: "Query should end with semicolon" };
  }

  return { valid: true };
}
