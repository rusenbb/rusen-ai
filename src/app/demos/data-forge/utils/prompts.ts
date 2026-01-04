import type { Table, Schema, GeneratedData, Column, ColumnType } from "../types";

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
  const fkColumnNames = new Set(references.map((r) => r.columnName));

  // Build column descriptions with realistic hints
  const columnDescriptions = table.columns
    .map((col) => {
      if (fkColumnNames.has(col.name)) {
        const ref = references.find((r) => r.columnName === col.name)!;
        const validValues = ref.values.slice(0, 8).map((v) => JSON.stringify(v)).join(", ");
        return `- ${col.name}: use one of [${validValues}]`;
      }
      return `- ${col.name}: ${getRealisticHint(col.type, col.name)}`;
    })
    .join("\n");

  // Build a realistic example row
  const exampleRow: Record<string, unknown> = {};
  for (const col of table.columns) {
    if (fkColumnNames.has(col.name)) {
      const ref = references.find((r) => r.columnName === col.name)!;
      exampleRow[col.name] = ref.values[0];
    } else {
      exampleRow[col.name] = getRealisticExample(col.type, col.name);
    }
  }

  // Build a second example row with different values
  const exampleRow2: Record<string, unknown> = {};
  for (const col of table.columns) {
    if (fkColumnNames.has(col.name)) {
      const ref = references.find((r) => r.columnName === col.name)!;
      exampleRow2[col.name] = ref.values[Math.min(1, ref.values.length - 1)];
    } else {
      exampleRow2[col.name] = getRealisticExample(col.type, col.name, 1);
    }
  }

  const contextLine = table.definition ? ` (${table.definition})` : "";

  // Build column specs with table-aware context
  const columnSpecs = table.columns.map(col => {
    const colContext = getColumnContext(col, table.name);
    return `"${col.name}": ${colContext}`;
  }).join(", ");

  // Limit rows to avoid token overflow - generate in smaller batches
  const safeRowCount = Math.min(table.rowCount, 15);

  // Simplified, more direct prompt for small models
  // Use {"data": [...]} format to align with JSON Schema enforcement
  const prompt = `Generate ${safeRowCount} JSON objects for "${table.name}"${contextLine}.

Each object needs: {${columnSpecs}}

Example:
{"data": [${JSON.stringify(exampleRow)}, ${JSON.stringify(exampleRow2)}]}

Output as {"data": [...]} with ${safeRowCount} objects:`;

  return prompt;
}

function getColumnContext(col: Column, tableName: string): string {
  const name = col.name.toLowerCase();
  const table = tableName.toLowerCase();

  // Table-specific context
  if (table.includes("comment")) {
    if (name.includes("author") || name.includes("name")) return "commenter's name";
    if (name.includes("content")) return "short comment text";
  }
  if (table.includes("post")) {
    if (name.includes("title")) return "blog post title";
    if (name.includes("content")) return "article excerpt (1 sentence)";
  }
  if (table.includes("author")) {
    if (name.includes("name")) return "author full name";
    if (name.includes("bio")) return "short bio (1 sentence)";
  }
  if (table.includes("user")) {
    if (name.includes("name")) return "person's full name";
  }
  if (table.includes("product")) {
    if (name.includes("name")) return "product name";
  }
  if (table.includes("order")) {
    if (name.includes("total")) return "order total (number)";
  }

  // Generic type hints
  switch (col.type) {
    case "uuid": return "UUID";
    case "email": return "email";
    case "date": return "YYYY-MM-DD";
    case "boolean": return "true/false";
    case "integer": return "number";
    case "float": return "decimal";
    case "text": return "short text";
    default: return "string";
  }
}

function getRealisticHint(type: ColumnType, colName: string): string {
  const nameLower = colName.toLowerCase();

  // Context-aware hints based on column name
  if (nameLower.includes("name") && !nameLower.includes("user")) {
    if (nameLower.includes("first")) return "real first name (e.g., Emma, James, Sofia)";
    if (nameLower.includes("last")) return "real last name (e.g., Johnson, Garcia, Chen)";
    if (nameLower.includes("company") || nameLower.includes("business")) return "real company name";
    if (nameLower.includes("product")) return "realistic product name";
    return "realistic full name (e.g., Sarah Mitchell, David Park)";
  }
  if (nameLower.includes("title")) return "realistic title (e.g., Senior Developer, Marketing Manager)";
  if (nameLower.includes("description") || nameLower.includes("bio")) return "realistic description (2-3 sentences)";
  if (nameLower.includes("address")) return "realistic street address";
  if (nameLower.includes("city")) return "real city name";
  if (nameLower.includes("country")) return "real country name";
  if (nameLower.includes("phone")) return "realistic phone number";
  if (nameLower.includes("price") || nameLower.includes("amount") || nameLower.includes("cost")) return "realistic price (e.g., 29.99, 149.00)";
  if (nameLower.includes("quantity") || nameLower.includes("count")) return "realistic quantity (1-100)";
  if (nameLower.includes("rating") || nameLower.includes("score")) return "rating 1-5";
  if (nameLower.includes("status")) return "status like active, pending, completed";
  if (nameLower.includes("category") || nameLower.includes("type")) return "realistic category name";
  if (nameLower.includes("url") || nameLower.includes("website")) return "realistic URL";
  if (nameLower.includes("image") || nameLower.includes("photo") || nameLower.includes("avatar")) return "image URL path";

  // Default hints by type
  switch (type) {
    case "string":
      return "short realistic text";
    case "integer":
      return "realistic number";
    case "float":
      return "realistic decimal number";
    case "boolean":
      return "true or false";
    case "date":
      return "recent date (YYYY-MM-DD format, years 2023-2024)";
    case "email":
      return "realistic email (e.g., john.doe@gmail.com)";
    case "uuid":
      return "valid UUID";
    case "text":
      return "realistic paragraph of text";
    default:
      return "appropriate value";
  }
}

function getRealisticExample(type: ColumnType, colName: string, index: number = 0): unknown {
  const nameLower = colName.toLowerCase();
  const i = index % 2; // Alternate between two examples

  // Context-aware examples with variations
  if (nameLower.includes("name")) {
    if (nameLower.includes("first")) return ["Emma", "James"][i];
    if (nameLower.includes("last")) return ["Thompson", "Garcia"][i];
    if (nameLower.includes("company")) return ["Acme Technologies", "TechFlow Inc"][i];
    if (nameLower.includes("product")) return ["Premium Wireless Headphones", "Smart Watch Pro"][i];
    return ["Sarah Mitchell", "James Chen"][i];
  }
  if (nameLower.includes("title")) return ["Senior Software Engineer", "Product Manager"][i];
  if (nameLower.includes("description")) return ["High-quality product with excellent features.", "Modern design with premium materials."][i];
  if (nameLower.includes("bio")) return ["Developer with 5 years of experience.", "Tech lead specializing in cloud architecture."][i];
  if (nameLower.includes("address")) return ["123 Oak Street, Suite 400", "456 Maple Avenue"][i];
  if (nameLower.includes("city")) return ["San Francisco", "New York"][i];
  if (nameLower.includes("country")) return ["United States", "Canada"][i];
  if (nameLower.includes("phone")) return ["+1-555-123-4567", "+1-555-987-6543"][i];
  if (nameLower.includes("price") || nameLower.includes("amount")) return [49.99, 89.99][i];
  if (nameLower.includes("total")) return [159.97, 249.50][i];
  if (nameLower.includes("quantity")) return [3, 5][i];
  if (nameLower.includes("rating")) return [4.5, 4.8][i];
  if (nameLower.includes("status")) return ["active", "pending"][i];
  if (nameLower.includes("category")) return ["Electronics", "Software"][i];
  if (nameLower.includes("url") || nameLower.includes("website")) return ["https://example.com/page1", "https://example.com/page2"][i];
  if (nameLower.includes("image") || nameLower.includes("avatar")) return ["/images/user-1.jpg", "/images/user-2.jpg"][i];
  if (nameLower.includes("content") || nameLower.includes("body")) return ["This article covers modern development practices.", "A guide to building scalable applications."][i];
  if (nameLower.includes("comment")) return ["Great article, very helpful!", "Thanks for sharing this information."][i];

  // Default examples by type
  switch (type) {
    case "string":
      return ["Example value", "Another example"][i];
    case "integer":
      return [42, 17][i];
    case "float":
      return [29.99, 45.50][i];
    case "boolean":
      return [true, false][i];
    case "date":
      return ["2024-03-15", "2024-06-22"][i];
    case "email":
      return ["sarah.mitchell@gmail.com", "james.chen@outlook.com"][i];
    case "uuid":
      return crypto.randomUUID();
    case "text":
      return ["Detailed description with context.", "Comprehensive overview of the topic."][i];
    default:
      return "value";
  }
}

export interface ParseResult {
  rows: Record<string, unknown>[];
  quality: "good" | "partial" | "fallback";
  issues: string[];
}

// Try to repair truncated JSON
function repairJson(json: string): string {
  let repaired = json.trim();

  // If it ends mid-string, close the string
  const lastQuote = repaired.lastIndexOf('"');
  const afterLastQuote = repaired.substring(lastQuote + 1);
  if (lastQuote > 0 && !afterLastQuote.includes('"') && afterLastQuote.length < 20) {
    // Likely truncated mid-string, try to close it
    repaired = repaired.substring(0, lastQuote + 1);
  }

  // Count brackets to close
  let openBraces = 0, openBrackets = 0;
  let inString = false;
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    const prev = i > 0 ? repaired[i - 1] : '';
    if (char === '"' && prev !== '\\') inString = !inString;
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  // Remove trailing comma if present
  repaired = repaired.replace(/,\s*$/, '');

  // Close unclosed structures
  while (openBraces > 0) { repaired += '}'; openBraces--; }
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }

  return repaired;
}

export function parseGeneratedData(
  jsonString: string,
  table: Table,
  schema?: Schema,
  existingData?: GeneratedData
): ParseResult {
  const issues: string[] = [];

  // Get FK references for validation
  const references = schema && existingData
    ? getReferencedData(table, schema, existingData)
    : [];

  const fkValueSets = new Map<string, Set<string>>();
  for (const ref of references) {
    fkValueSets.set(ref.columnName, new Set(ref.values.map((v) => JSON.stringify(v))));
  }

  console.log(`[Data Forge] Raw LLM response for "${table.name}":`, jsonString.substring(0, 500));

  try {
    // Clean the response - remove markdown code blocks if present
    let cleanJson = jsonString.trim();

    // Remove markdown code blocks
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Try to find JSON in the response if it's wrapped in text
    const jsonMatch = cleanJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    // Try to parse, and if it fails, attempt repair
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      console.log("[Data Forge] Initial parse failed, attempting repair...");
      const repaired = repairJson(cleanJson);
      parsed = JSON.parse(repaired);
      issues.push("JSON was truncated and repaired");
    }

    // Handle various response formats
    let rows: unknown[] | null = null;

    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed?.rows && Array.isArray(parsed.rows)) {
      rows = parsed.rows;
    } else if (parsed?.data && Array.isArray(parsed.data)) {
      rows = parsed.data;
    } else if (typeof parsed === "object" && parsed !== null) {
      const keys = Object.keys(parsed);
      // Check if any key contains an array (handles {"authors": [...]} etc.)
      for (const key of keys) {
        if (Array.isArray(parsed[key])) {
          rows = parsed[key];
          break;
        }
      }
      // Fallback: Object with numeric keys like {"0": {...}, "1": {...}}
      if (!rows && keys.length > 0 && keys.every(k => !isNaN(Number(k)))) {
        rows = Object.values(parsed);
      }
    }

    if (!rows || rows.length === 0) {
      console.warn("[Data Forge] Empty response, using fallback. Parsed:", parsed);
      issues.push("Model returned empty data");
      return { rows: generateFallbackData(table, references), quality: "fallback", issues };
    }

    // Check what keys the LLM actually returned vs what we expected
    const expectedCols = new Set(table.columns.map(c => c.name));
    const firstRow = rows[0] as Record<string, unknown>;
    const returnedKeys = Object.keys(firstRow || {});
    const missingCols = table.columns.filter(c => !returnedKeys.includes(c.name)).map(c => c.name);

    if (missingCols.length > 0) {
      console.warn(`[Data Forge] LLM returned keys: [${returnedKeys.join(", ")}], missing: [${missingCols.join(", ")}]`);
      issues.push(`Missing columns: ${missingCols.join(", ")}`);
    }

    let hadMissingValues = false;

    // Validate and clean the data, enforcing FK constraints
    const cleanedRows = rows.slice(0, table.rowCount).map((row: unknown, index: number) => {
      const cleanedRow: Record<string, unknown> = {};
      const rowData = row as Record<string, unknown>;

      for (const col of table.columns) {
        let value = rowData?.[col.name];

        // Enforce FK constraint - if value is invalid, pick a valid one
        if (fkValueSets.has(col.name)) {
          const validValues = references.find((r) => r.columnName === col.name)!.values;
          const valueStr = JSON.stringify(value);

          if (!fkValueSets.get(col.name)!.has(valueStr) || value === undefined) {
            value = validValues[index % validValues.length];
          }
        }

        if (value === undefined || value === null) {
          hadMissingValues = true;
        }

        cleanedRow[col.name] = value ?? (col.nullable ? null : generateFallbackValue(col, index));
      }
      return cleanedRow;
    });

    const quality = missingCols.length === 0 && !hadMissingValues ? "good" : "partial";

    if (quality === "partial") {
      console.warn(`[Data Forge] Partial data quality for "${table.name}" - some values filled with fallbacks`);
    }

    return { rows: cleanedRows, quality, issues };
  } catch (err) {
    console.error("[Data Forge] Parse failed:", err, "\nRaw:", jsonString);
    issues.push(`Parse error: ${err instanceof Error ? err.message : "Unknown error"}`);
    return { rows: generateFallbackData(table, references), quality: "fallback", issues };
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

// Realistic fallback data pools
const FIRST_NAMES = ["Emma", "Liam", "Olivia", "Noah", "Ava", "James", "Sophia", "William", "Isabella", "Oliver", "Mia", "Benjamin", "Charlotte", "Elijah", "Amelia", "Lucas", "Harper", "Mason", "Evelyn", "Logan"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris"];
const COMPANIES = ["Acme Corp", "TechFlow Inc", "Global Solutions", "Innovate Labs", "Digital Dynamics", "Cloud Nine Systems", "Peak Performance", "Bright Future Co", "Swift Solutions", "Prime Industries"];
const PRODUCTS = ["Premium Headphones", "Wireless Keyboard", "Smart Watch Pro", "Fitness Tracker", "Portable Charger", "Bluetooth Speaker", "Gaming Mouse", "LED Desk Lamp", "USB Hub", "Webcam HD"];
const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "San Francisco", "Seattle", "Denver", "Boston", "Austin"];
const STATUSES = ["active", "pending", "completed", "processing", "cancelled"];
const CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Toys", "Health", "Automotive", "Food", "Office"];

function generateFallbackValue(col: Column, index: number): unknown {
  if (col.nullable && Math.random() < 0.1) return null;

  const nameLower = col.name.toLowerCase();

  // Context-aware realistic fallback
  if (nameLower.includes("first") && nameLower.includes("name")) {
    return FIRST_NAMES[index % FIRST_NAMES.length];
  }
  if (nameLower.includes("last") && nameLower.includes("name")) {
    return LAST_NAMES[index % LAST_NAMES.length];
  }
  if (nameLower.includes("name") && !nameLower.includes("user")) {
    if (nameLower.includes("company") || nameLower.includes("business")) {
      return COMPANIES[index % COMPANIES.length];
    }
    if (nameLower.includes("product")) {
      return PRODUCTS[index % PRODUCTS.length];
    }
    return `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index + 7) % LAST_NAMES.length]}`;
  }
  if (nameLower.includes("city")) {
    return CITIES[index % CITIES.length];
  }
  if (nameLower.includes("status")) {
    return STATUSES[index % STATUSES.length];
  }
  if (nameLower.includes("category") || nameLower.includes("type")) {
    return CATEGORIES[index % CATEGORIES.length];
  }
  if (nameLower.includes("price") || nameLower.includes("amount") || nameLower.includes("cost")) {
    return Math.round((19.99 + index * 15.5) * 100) / 100;
  }
  if (nameLower.includes("total")) {
    return Math.round((49.99 + index * 25) * 100) / 100;
  }
  if (nameLower.includes("quantity") || nameLower.includes("count")) {
    return (index % 10) + 1;
  }
  if (nameLower.includes("rating") || nameLower.includes("score")) {
    return Math.round((3 + (index % 5) * 0.5) * 10) / 10;
  }
  if (nameLower.includes("title")) {
    const titles = ["Software Engineer", "Product Manager", "Designer", "Data Analyst", "Marketing Lead"];
    return titles[index % titles.length];
  }
  if (nameLower.includes("phone")) {
    return `+1-555-${String(100 + index).padStart(3, "0")}-${String(1000 + index * 11).slice(-4)}`;
  }
  if (nameLower.includes("address")) {
    return `${100 + index * 23} ${["Oak", "Maple", "Pine", "Cedar", "Elm"][index % 5]} Street`;
  }

  // Context-aware text content
  if (col.type === "text") {
    if (nameLower.includes("bio")) {
      const bios = [
        "Passionate software engineer with 8 years of experience in web development and cloud architecture.",
        "Full-stack developer specializing in React and Node.js. Open source contributor and tech blogger.",
        "Senior developer focused on building scalable applications. Previously worked at several startups.",
        "Creative technologist with a background in computer science. Loves solving complex problems.",
        "Tech enthusiast and mentor. Enjoys teaching and writing about modern development practices."
      ];
      return bios[index % bios.length];
    }
    if (nameLower.includes("content") || nameLower.includes("body")) {
      const contents = [
        "In this article, we explore the fundamentals of modern web development and discuss best practices for building maintainable applications. We'll cover key concepts that every developer should understand.",
        "Today we're diving deep into performance optimization techniques. From lazy loading to code splitting, these strategies will help you build faster, more responsive applications.",
        "Understanding state management is crucial for any frontend developer. Let's examine different approaches and when to use each one in your projects.",
        "Security should never be an afterthought. This guide covers essential security practices that will help protect your applications and users from common vulnerabilities.",
        "Testing is a critical part of the development process. We'll explore different testing strategies and how to implement them effectively in your workflow."
      ];
      return contents[index % contents.length];
    }
    if (nameLower.includes("description")) {
      const descriptions = [
        "A comprehensive solution designed for modern workflows. Features intuitive controls and seamless integration.",
        "Built with quality materials and attention to detail. Perfect for both beginners and professionals.",
        "Innovative design meets practical functionality. Streamlines your daily tasks with ease.",
        "Premium quality with exceptional durability. Backed by excellent customer support.",
        "Versatile and reliable for various use cases. Simple setup and easy to maintain."
      ];
      return descriptions[index % descriptions.length];
    }
    if (nameLower.includes("comment")) {
      const comments = [
        "Great article! This really helped me understand the concept better. Thanks for sharing.",
        "Very informative post. I've been looking for this kind of explanation for a while.",
        "Thanks for the detailed breakdown. The examples were particularly helpful.",
        "Excellent content as always. Looking forward to more articles like this.",
        "This solved a problem I've been struggling with. Much appreciated!"
      ];
      return comments[index % comments.length];
    }
  }

  // Default by type
  switch (col.type) {
    case "string":
      return `${col.name} ${index + 1}`;
    case "integer":
      return index + 1;
    case "float":
      return Math.round((index + 1) * 10.5 * 100) / 100;
    case "boolean":
      return index % 2 === 0;
    case "date": {
      const date = new Date(2024, 0, 1);
      date.setDate(date.getDate() + index * 3);
      return date.toISOString().split("T")[0];
    }
    case "email": {
      const first = FIRST_NAMES[index % FIRST_NAMES.length].toLowerCase();
      const last = LAST_NAMES[(index + 5) % LAST_NAMES.length].toLowerCase();
      const domains = ["gmail.com", "yahoo.com", "outlook.com", "email.com"];
      return `${first}.${last}@${domains[index % domains.length]}`;
    }
    case "uuid":
      return crypto.randomUUID();
    case "text":
      const texts = [
        "This is a detailed entry with relevant information. It provides context and useful details for reference.",
        "A well-structured piece of content that covers the key points. Clear and informative throughout.",
        "Comprehensive information presented in an accessible format. Covers all the essential aspects.",
        "Thoughtfully written content with attention to detail. Addresses the main topics effectively.",
        "Quality content that delivers value. Well-organized and easy to understand."
      ];
      return texts[index % texts.length];
    default:
      return null;
  }
}

// Build JSON Schema for structured output enforcement
function getJsonSchemaType(colType: ColumnType): object {
  switch (colType) {
    case "string":
    case "text":
    case "email":
    case "uuid":
    case "date":
      return { type: "string" };
    case "integer":
      return { type: "integer" };
    case "float":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    default:
      return { type: "string" };
  }
}

export function buildJsonSchema(table: Table): string {
  const properties: Record<string, object> = {};

  for (const col of table.columns) {
    properties[col.name] = getJsonSchemaType(col.type);
  }

  const schema = {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: {
          type: "object",
          properties,
          required: table.columns.filter(c => !c.nullable).map(c => c.name)
        }
      }
    },
    required: ["data"]
  };

  return JSON.stringify(schema);
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
