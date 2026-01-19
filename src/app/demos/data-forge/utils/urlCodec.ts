import type { Schema } from "../types";

/**
 * Encode a schema to a URL-safe base64 string.
 */
export function encodeSchemaToUrl(schema: Schema): string {
  const json = JSON.stringify(schema);
  // Use encodeURIComponent to handle Unicode, then btoa for base64
  return btoa(encodeURIComponent(json));
}

/**
 * Decode a URL parameter back to a schema.
 * Returns null if decoding fails or schema is invalid.
 */
export function decodeSchemaFromUrl(encoded: string): Schema | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const schema = JSON.parse(json) as Schema;

    // Basic validation
    if (!schema.tables || !Array.isArray(schema.tables)) {
      return null;
    }
    if (!schema.foreignKeys || !Array.isArray(schema.foreignKeys)) {
      return null;
    }

    // Validate each table has required fields
    for (const table of schema.tables) {
      if (!table.id || !table.name || !Array.isArray(table.columns)) {
        return null;
      }
    }

    return schema;
  } catch {
    return null;
  }
}

/**
 * Check if the encoded schema string is within safe URL limits.
 * Most browsers support ~2000 chars in URLs, but we're conservative.
 */
export function isSchemaUrlSafe(encoded: string): boolean {
  return encoded.length < 1800;
}
