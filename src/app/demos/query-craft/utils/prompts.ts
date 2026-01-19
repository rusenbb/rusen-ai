import type { Schema, SQLDialect } from "../types";

// Build schema DDL representation for LLM context
export function buildSchemaContext(schema: Schema): string {
  if (schema.tables.length === 0) {
    return "No tables defined.";
  }

  const ddlStatements = schema.tables.map((table) => {
    const columnDefs = table.columns.map((col) => {
      const typeMap: Record<string, Record<SQLDialect, string>> = {
        string: { postgresql: "VARCHAR(255)", mysql: "VARCHAR(255)", sqlite: "TEXT", "sql-server": "NVARCHAR(255)" },
        integer: { postgresql: "INTEGER", mysql: "INT", sqlite: "INTEGER", "sql-server": "INT" },
        float: { postgresql: "DECIMAL(10,2)", mysql: "DECIMAL(10,2)", sqlite: "REAL", "sql-server": "DECIMAL(10,2)" },
        boolean: { postgresql: "BOOLEAN", mysql: "BOOLEAN", sqlite: "INTEGER", "sql-server": "BIT" },
        date: { postgresql: "DATE", mysql: "DATE", sqlite: "TEXT", "sql-server": "DATE" },
        datetime: { postgresql: "TIMESTAMP", mysql: "DATETIME", sqlite: "TEXT", "sql-server": "DATETIME2" },
        text: { postgresql: "TEXT", mysql: "TEXT", sqlite: "TEXT", "sql-server": "NVARCHAR(MAX)" },
      };

      const sqlType = typeMap[col.type]?.[schema.dialect] || "VARCHAR(255)";
      let def = `  ${col.name} ${sqlType}`;

      if (col.isPrimaryKey) {
        def += " PRIMARY KEY";
      }

      if (col.isForeignKey && col.referencesTable && col.referencesColumn) {
        def += ` REFERENCES ${col.referencesTable}(${col.referencesColumn})`;
      }

      return def;
    });

    let ddl = `CREATE TABLE ${table.name} (\n${columnDefs.join(",\n")}\n);`;

    if (table.description) {
      ddl = `-- ${table.description}\n${ddl}`;
    }

    return ddl;
  });

  return ddlStatements.join("\n\n");
}

// System prompt for SQL generation
export function getSystemPrompt(dialect: SQLDialect, includeExplanation: boolean = false): string {
  const dialectNames: Record<SQLDialect, string> = {
    postgresql: "PostgreSQL",
    mysql: "MySQL",
    sqlite: "SQLite",
    "sql-server": "SQL Server",
  };

  const baseRules = `You are an expert SQL query writer. You translate natural language questions into correct, efficient ${dialectNames[dialect]} queries.

Rules:
1. ${includeExplanation ? "Output the SQL query followed by a brief explanation." : "Output ONLY the SQL query, nothing else. No explanations, no markdown, no comments."}
2. Use the exact table and column names from the schema provided.
3. Write efficient queries using appropriate JOINs when needed.
4. Use ${dialectNames[dialect]}-specific syntax when necessary.
5. Always include appropriate WHERE clauses to filter data as requested.
6. Use aggregate functions (COUNT, SUM, AVG, etc.) when the question asks for counts, totals, or averages.
7. Use GROUP BY when aggregating data by categories.
8. Use ORDER BY when the question implies a ranking or sorting.
9. Use LIMIT when the question asks for "top N" or a specific number of results.
10. If the question is ambiguous, make reasonable assumptions.
11. End the query with a semicolon.`;

  if (includeExplanation) {
    return baseRules + `
12. After the SQL query, add a blank line and then provide a brief explanation (2-3 sentences) starting with "Explanation:" that describes what the query does and why you chose this approach.`;
  }

  return baseRules;
}

// Build the user prompt with schema and natural language query
export function buildUserPrompt(schema: Schema, naturalLanguageQuery: string): string {
  const schemaContext = buildSchemaContext(schema);

  return `Database Schema:
${schemaContext}

Natural Language Query:
${naturalLanguageQuery}

SQL Query:`;
}

// Example queries for each preset schema
export const EXAMPLE_QUERIES: Record<string, string[]> = {
  "E-commerce": [
    "Find all customers from New York",
    "Show top 10 products by price",
    "List all orders placed in the last month",
    "Count orders per customer",
    "Find customers who haven't placed any orders",
    "Calculate total revenue by product category",
    "Show the most popular products (by order count)",
    "Find orders with total amount greater than $100",
  ],
  "HR System": [
    "List all employees in the Engineering department",
    "Find employees hired in the last year",
    "Show average salary by department",
    "List managers and their direct reports",
    "Find the highest paid employee in each department",
    "Count employees per department",
    "Show projects ending this quarter",
    "Find employees without a manager",
  ],
  "Blog": [
    "Show all published posts by a specific author",
    "Find the most commented posts",
    "List posts with no comments",
    "Show tags used most frequently",
    "Find users who have commented the most",
    "List posts by view count descending",
    "Show recent posts from the last week",
    "Find all posts with a specific tag",
  ],
};
