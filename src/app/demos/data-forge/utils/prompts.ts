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

function getReferencedData(
  table: Table,
  schema: Schema,
  existingData: GeneratedData
): { columnName: string; targetTable: string; values: unknown[] }[] {
  const references: { columnName: string; targetTable: string; values: unknown[] }[] = [];

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

  let prompt = `Generate exactly ${table.rowCount} rows of realistic fake data for a database table called "${table.name}".

Columns:
${table.columns
  .map((col) => {
    let desc = `- "${col.name}": ${getTypeDescription(col.type)}`;
    if (col.isPrimaryKey) desc += " (primary key - must be unique)";
    if (col.nullable) desc += " (can be null)";
    return desc;
  })
  .join("\n")}
`;

  if (references.length > 0) {
    prompt += `\nForeign key constraints:
${references
  .map((ref) => {
    const sampleValues = ref.values.slice(0, 5);
    return `- "${ref.columnName}" must be one of these values from ${ref.targetTable}: [${sampleValues.map((v) => JSON.stringify(v)).join(", ")}${ref.values.length > 5 ? ", ..." : ""}]`;
  })
  .join("\n")}
`;
  }

  prompt += `
Respond with a JSON object containing a "rows" array with exactly ${table.rowCount} objects.
Make the data realistic and contextually appropriate for the column names.
Example format:
{"rows": [{"column1": "value1", "column2": "value2"}, ...]}`;

  return prompt;
}

export function parseGeneratedData(
  jsonString: string,
  table: Table
): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(jsonString);

    // Handle both {rows: [...]} and direct array formats
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;

    if (!Array.isArray(rows)) {
      console.error("Invalid response format:", parsed);
      return generateFallbackData(table);
    }

    // Validate and clean the data
    return rows.map((row: Record<string, unknown>) => {
      const cleanedRow: Record<string, unknown> = {};
      for (const col of table.columns) {
        cleanedRow[col.name] = row[col.name] ?? (col.nullable ? null : getDefaultValue(col.type));
      }
      return cleanedRow;
    });
  } catch (err) {
    console.error("Failed to parse generated data:", err);
    return generateFallbackData(table);
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

function generateFallbackData(table: Table): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < table.rowCount; i++) {
    const row: Record<string, unknown> = {};
    for (const col of table.columns) {
      row[col.name] = generateFallbackValue(col, i);
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
