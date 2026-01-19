// Column type for schema definition
export type ColumnType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "text";

export const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: "string", label: "String (VARCHAR)" },
  { value: "integer", label: "Integer" },
  { value: "float", label: "Float/Decimal" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "text", label: "Text (Long)" },
];

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencesTable?: string;
  referencesColumn?: string;
}

export interface Table {
  id: string;
  name: string;
  description: string;
  columns: Column[];
}

export interface Schema {
  tables: Table[];
  dialect: SQLDialect;
}

export type SQLDialect = "postgresql" | "mysql" | "sqlite" | "sql-server";

export const SQL_DIALECTS: { value: SQLDialect; label: string }[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "sql-server", label: "SQL Server" },
];

export interface QueryHistory {
  id: string;
  naturalLanguage: string;
  sql: string;
  timestamp: number;
}

export interface GenerationProgress {
  status: "idle" | "generating" | "complete" | "error";
  error?: string;
}

// Reducer types
export type QueryCraftAction =
  | { type: "ADD_TABLE" }
  | { type: "UPDATE_TABLE"; tableId: string; updates: Partial<Table> }
  | { type: "DELETE_TABLE"; tableId: string }
  | { type: "ADD_COLUMN"; tableId: string }
  | { type: "UPDATE_COLUMN"; tableId: string; columnId: string; updates: Partial<Column> }
  | { type: "DELETE_COLUMN"; tableId: string; columnId: string }
  | { type: "SET_DIALECT"; dialect: SQLDialect }
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_GENERATED_SQL"; sql: string }
  | { type: "CLEAR_GENERATED_SQL" }
  | { type: "SET_GENERATION_PROGRESS"; progress: Partial<GenerationProgress> }
  | { type: "ADD_TO_HISTORY"; entry: QueryHistory }
  | { type: "CLEAR_HISTORY" }
  | { type: "LOAD_PRESET"; schema: Schema }
  | { type: "RESET" };

export interface QueryCraftState {
  schema: Schema;
  query: string;
  generatedSQL: string | null;
  generationProgress: GenerationProgress;
  history: QueryHistory[];
}

// Helper to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Create default column
export function createDefaultColumn(): Column {
  return {
    id: generateId(),
    name: "",
    type: "string",
    isPrimaryKey: false,
    isForeignKey: false,
  };
}

// Create default table
export function createDefaultTable(): Table {
  const tableId = generateId();
  return {
    id: tableId,
    name: `table_${tableId.substring(0, 4)}`,
    description: "",
    columns: [
      {
        id: generateId(),
        name: "id",
        type: "integer",
        isPrimaryKey: true,
        isForeignKey: false,
      },
    ],
  };
}

// Initial state
export const initialState: QueryCraftState = {
  schema: {
    tables: [],
    dialect: "postgresql",
  },
  query: "",
  generatedSQL: null,
  generationProgress: {
    status: "idle",
  },
  history: [],
};

// Preset schemas
export const PRESET_SCHEMAS: { name: string; schema: Schema }[] = [
  {
    name: "E-commerce",
    schema: {
      dialect: "postgresql",
      tables: [
        {
          id: "customers",
          name: "customers",
          description: "Store customers with contact info",
          columns: [
            { id: "c1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "c2", name: "name", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "c3", name: "email", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "c4", name: "city", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "c5", name: "created_at", type: "datetime", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "products",
          name: "products",
          description: "Products available for sale",
          columns: [
            { id: "p1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "p2", name: "name", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "p3", name: "category", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "p4", name: "price", type: "float", isPrimaryKey: false, isForeignKey: false },
            { id: "p5", name: "stock_quantity", type: "integer", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "orders",
          name: "orders",
          description: "Customer orders with totals",
          columns: [
            { id: "o1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "o2", name: "customer_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "customers", referencesColumn: "id" },
            { id: "o3", name: "order_date", type: "datetime", isPrimaryKey: false, isForeignKey: false },
            { id: "o4", name: "total_amount", type: "float", isPrimaryKey: false, isForeignKey: false },
            { id: "o5", name: "status", type: "string", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "order_items",
          name: "order_items",
          description: "Individual items in each order",
          columns: [
            { id: "oi1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "oi2", name: "order_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "orders", referencesColumn: "id" },
            { id: "oi3", name: "product_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "products", referencesColumn: "id" },
            { id: "oi4", name: "quantity", type: "integer", isPrimaryKey: false, isForeignKey: false },
            { id: "oi5", name: "unit_price", type: "float", isPrimaryKey: false, isForeignKey: false },
          ],
        },
      ],
    },
  },
  {
    name: "HR System",
    schema: {
      dialect: "postgresql",
      tables: [
        {
          id: "departments",
          name: "departments",
          description: "Company departments",
          columns: [
            { id: "d1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "d2", name: "name", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "d3", name: "budget", type: "float", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "employees",
          name: "employees",
          description: "Company employees",
          columns: [
            { id: "e1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "e2", name: "name", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "e3", name: "email", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "e4", name: "department_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "departments", referencesColumn: "id" },
            { id: "e5", name: "salary", type: "float", isPrimaryKey: false, isForeignKey: false },
            { id: "e6", name: "hire_date", type: "date", isPrimaryKey: false, isForeignKey: false },
            { id: "e7", name: "manager_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "employees", referencesColumn: "id" },
          ],
        },
        {
          id: "projects",
          name: "projects",
          description: "Ongoing projects",
          columns: [
            { id: "pr1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "pr2", name: "name", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "pr3", name: "department_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "departments", referencesColumn: "id" },
            { id: "pr4", name: "start_date", type: "date", isPrimaryKey: false, isForeignKey: false },
            { id: "pr5", name: "end_date", type: "date", isPrimaryKey: false, isForeignKey: false },
          ],
        },
      ],
    },
  },
  {
    name: "Blog",
    schema: {
      dialect: "postgresql",
      tables: [
        {
          id: "users",
          name: "users",
          description: "Blog users and authors",
          columns: [
            { id: "u1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "u2", name: "username", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "u3", name: "email", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "u4", name: "is_admin", type: "boolean", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "posts",
          name: "posts",
          description: "Blog posts and articles",
          columns: [
            { id: "p1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "p2", name: "author_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "users", referencesColumn: "id" },
            { id: "p3", name: "title", type: "string", isPrimaryKey: false, isForeignKey: false },
            { id: "p4", name: "content", type: "text", isPrimaryKey: false, isForeignKey: false },
            { id: "p5", name: "published_at", type: "datetime", isPrimaryKey: false, isForeignKey: false },
            { id: "p6", name: "view_count", type: "integer", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "comments",
          name: "comments",
          description: "User comments on posts",
          columns: [
            { id: "cm1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "cm2", name: "post_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "posts", referencesColumn: "id" },
            { id: "cm3", name: "user_id", type: "integer", isPrimaryKey: false, isForeignKey: true, referencesTable: "users", referencesColumn: "id" },
            { id: "cm4", name: "content", type: "text", isPrimaryKey: false, isForeignKey: false },
            { id: "cm5", name: "created_at", type: "datetime", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "tags",
          name: "tags",
          description: "Post tags/categories",
          columns: [
            { id: "t1", name: "id", type: "integer", isPrimaryKey: true, isForeignKey: false },
            { id: "t2", name: "name", type: "string", isPrimaryKey: false, isForeignKey: false },
          ],
        },
        {
          id: "post_tags",
          name: "post_tags",
          description: "Many-to-many relationship between posts and tags",
          columns: [
            { id: "pt1", name: "post_id", type: "integer", isPrimaryKey: true, isForeignKey: true, referencesTable: "posts", referencesColumn: "id" },
            { id: "pt2", name: "tag_id", type: "integer", isPrimaryKey: true, isForeignKey: true, referencesTable: "tags", referencesColumn: "id" },
          ],
        },
      ],
    },
  },
];
