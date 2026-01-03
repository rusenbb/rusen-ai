import type { Table, Schema, GeneratedData, Column, ColumnType } from "../types";

function getTypeDescription(type: ColumnType): string {
  switch (type) {
    case "string":
      return "a short text string (1-50 chars)";
    case "integer":
      return "a whole number";
    case "float":
      return "a decimal number";
    case "boolean":
      return "true or false";
    case "date":
      return "a date in YYYY-MM-DD format";
    case "email":
      return "a valid email address";
    case "uuid":
      return "a UUID like 550e8400-e29b-41d4-a716-446655440000";
    case "text":
      return "a longer text (1-3 sentences)";
    default:
      return "a value";
  }
}

interface ForeignKeyReference {
  columnName: string;
  targetTable: string;
  values: unknown[];
}

function getReferencedData(
  table: Table,
  schema: Schema,
  existingData: GeneratedData
): ForeignKeyReference[] {
  const references: ForeignKeyReference[] = [];

  for (const fk of schema.foreignKeys) {
    if (fk.sourceTableId === table.id) {
      const targetTable = schema.tables.find((t) => t.id === fk.targetTableId);
      const sourceColumn = table.columns.find((c) => c.id === fk.sourceColumnId);
      const targetColumn = targetTable?.columns.find((c) => c.id === fk.targetColumnId);

      if (targetTable && sourceColumn && targetColumn && existingData[targetTable.name]) {
        const values = existingData[targetTable.name].map((row) => row[targetColumn.name]);
        references.push({
          columnName: sourceColumn.name,
          targetTable: targetTable.name,
          values,
        });
      }
    }
  }

  return references;
}

export function buildGenerationPrompt(
  table: Table,
  schema: Schema,
  existingData: GeneratedData
): string {
  const references = getReferencedData(table, schema, existingData);

  // Build column descriptions, marking FK columns specially
  const fkColumnNames = new Set(references.map((r) => r.columnName));

  const columnDescriptions = table.columns
    .map((col) => {
      if (fkColumnNames.has(col.name)) {
        const ref = references.find((r) => r.columnName === col.name)!;
        // Show ALL valid values for FK columns so model can pick from them
        const allValues = ref.values.map((v) => JSON.stringify(v)).join(", ");
        return `- "${col.name}": MUST be exactly one of these values: [${allValues}]`;
      }

      let desc = `- "${col.name}": ${getTypeDescription(col.type)}`;
      if (col.isPrimaryKey) desc += " (primary key - must be unique)";
      if (col.nullable) desc += " (can be null)";
      return desc;
    })
    .join("\n");

  const prompt = `Generate ${table.rowCount} rows for table "${table.name}".

Columns:
${columnDescriptions}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation.
Format: {"rows": [{"col1": "val1", "col2": "val2"}, ...]}

Generate exactly ${table.rowCount} rows now:`;

  return prompt;
}

export function parseGeneratedData(
  jsonString: string,
  table: Table,
  schema?: Schema,
  existingData?: GeneratedData
): Record<string, unknown>[] {
  // Get FK references for validation
  const references = schema && existingData
    ? getReferencedData(table, schema, existingData)
    : [];

  const fkValueSets = new Map<string, Set<string>>();
  for (const ref of references) {
    fkValueSets.set(ref.columnName, new Set(ref.values.map((v) => JSON.stringify(v))));
  }

  try {
    // Clean the response - remove markdown code blocks if present
    let cleanJson = jsonString.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleanJson);

    // Handle both {rows: [...]} and direct array formats
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;

    if (!Array.isArray(rows)) {
      console.error("Invalid response format:", parsed);
      return generateFallbackData(table, references);
    }

    // Validate and clean the data, enforcing FK constraints
    return rows.slice(0, table.rowCount).map((row: Record<string, unknown>, index: number) => {
      const cleanedRow: Record<string, unknown> = {};

      for (const col of table.columns) {
        let value = row[col.name];

        // Enforce FK constraint - if value is invalid, pick a random valid one
        if (fkValueSets.has(col.name)) {
          const validValues = references.find((r) => r.columnName === col.name)!.values;
          const valueStr = JSON.stringify(value);

          if (!fkValueSets.get(col.name)!.has(valueStr) || value === undefined) {
            // Pick a random valid value
            value = validValues[index % validValues.length];
          }
        }

        cleanedRow[col.name] = value ?? (col.nullable ? null : getDefaultValue(col.type));
      }
      return cleanedRow;
    });
  } catch (err) {
    console.error("Failed to parse generated data:", err, "\nRaw:", jsonString);
    return generateFallbackData(table, references);
  }
}

function getDefaultValue(type: ColumnType): unknown {
  switch (type) {
    case "string":
      return "sample";
    case "integer":
      return 0;
    case "float":
      return 0.0;
    case "boolean":
      return false;
    case "date":
      return new Date().toISOString().split("T")[0];
    case "email":
      return "example@email.com";
    case "uuid":
      return crypto.randomUUID();
    case "text":
      return "Sample text.";
    default:
      return null;
  }
}

function generateFallbackData(
  table: Table,
  references: ForeignKeyReference[] = []
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < table.rowCount; i++) {
    const row: Record<string, unknown> = {};
    for (const col of table.columns) {
      // Check if this column has a FK reference
      const ref = references.find((r) => r.columnName === col.name);
      if (ref && ref.values.length > 0) {
        // Use a value from the referenced table
        row[col.name] = ref.values[i % ref.values.length];
      } else {
        row[col.name] = generateFallbackValue(col, i);
      }
    }
    rows.push(row);
  }
  return rows;
}

function generateFallbackValue(col: Column, index: number): unknown {
  if (col.nullable && Math.random() < 0.1) return null;

  switch (col.type) {
    case "string":
      return `${col.name}_${index + 1}`;
    case "integer":
      return index + 1;
    case "float":
      return Math.round((index + 1) * 10.5 * 100) / 100;
    case "boolean":
      return index % 2 === 0;
    case "date": {
      const date = new Date();
      date.setDate(date.getDate() - index);
      return date.toISOString().split("T")[0];
    }
    case "email":
      return `user${index + 1}@example.com`;
    case "uuid":
      return crypto.randomUUID();
    case "text":
      return `This is sample text for row ${index + 1}.`;
    default:
      return null;
  }
}

// Topological sort for table dependencies
export function getTableGenerationOrder(schema: Schema): Table[] {
  const tables = [...schema.tables];
  const result: Table[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function getDependencies(tableId: string): string[] {
    return schema.foreignKeys
      .filter((fk) => fk.sourceTableId === tableId)
      .map((fk) => fk.targetTableId);
  }

  function visit(tableId: string): void {
    if (visited.has(tableId)) return;
    if (visiting.has(tableId)) {
      // Circular dependency - just proceed
      return;
    }

    visiting.add(tableId);

    for (const depId of getDependencies(tableId)) {
      visit(depId);
    }

    visiting.delete(tableId);
    visited.add(tableId);

    const table = tables.find((t) => t.id === tableId);
    if (table) {
      result.push(table);
    }
  }

  for (const table of tables) {
    visit(table.id);
  }

  return result;
}
