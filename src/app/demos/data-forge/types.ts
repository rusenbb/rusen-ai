export type ColumnType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "date"
  | "email"
  | "uuid"
  | "text";

export const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "integer", label: "Integer" },
  { value: "float", label: "Float" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "uuid", label: "UUID" },
  { value: "text", label: "Text" },
];

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  nullable: boolean;
  isPrimaryKey: boolean;
}

export interface Table {
  id: string;
  name: string;
  definition: string;
  columns: Column[];
  rowCount: number;
}

export interface ForeignKey {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
}

export interface Schema {
  tables: Table[];
  foreignKeys: ForeignKey[];
}

export interface GeneratedData {
  [tableName: string]: Record<string, unknown>[];
}

export type ExportFormat = "sql" | "json" | "csv";

// Model options for WebLLM
export interface ModelOption {
  id: string;
  name: string;
  size: string;
  description: string;
  vramRequired: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "Qwen3-0.6B-q4f16_1-MLC",
    name: "Qwen3 0.6B",
    size: "~400MB",
    description: "Fastest, works on most devices",
    vramRequired: "2GB",
  },
  {
    id: "Qwen3-1.7B-q4f16_1-MLC",
    name: "Qwen3 1.7B",
    size: "~1GB",
    description: "Good balance of speed and quality",
    vramRequired: "3GB",
  },
  {
    id: "Qwen3-4B-q4f16_1-MLC",
    name: "Qwen3 4B",
    size: "~2.5GB",
    description: "Best quality, requires more VRAM",
    vramRequired: "5GB",
  },
];

export const DEFAULT_MODEL_ID = "Qwen3-0.6B-q4f16_1-MLC";

export interface TableQuality {
  tableName: string;
  quality: "good" | "partial" | "fallback";
  issues: string[];
}

export interface GenerationProgress {
  status: "idle" | "loading-model" | "generating" | "complete" | "error";
  currentTable?: string;
  tablesCompleted: number;
  totalTables: number;
  modelLoadProgress: number;
  error?: string;
  qualityReport?: TableQuality[];
}

// Reducer types
export type DataForgeAction =
  | { type: "ADD_TABLE" }
  | { type: "UPDATE_TABLE"; tableId: string; updates: Partial<Table> }
  | { type: "DELETE_TABLE"; tableId: string }
  | { type: "ADD_COLUMN"; tableId: string }
  | { type: "UPDATE_COLUMN"; tableId: string; columnId: string; updates: Partial<Column> }
  | { type: "DELETE_COLUMN"; tableId: string; columnId: string }
  | { type: "ADD_FOREIGN_KEY"; foreignKey: Omit<ForeignKey, "id"> }
  | { type: "DELETE_FOREIGN_KEY"; foreignKeyId: string }
  | { type: "SET_GENERATED_DATA"; data: GeneratedData }
  | { type: "CLEAR_GENERATED_DATA" }
  | { type: "SET_GENERATION_PROGRESS"; progress: Partial<GenerationProgress> }
  | { type: "SET_EXPORT_FORMAT"; format: ExportFormat }
  | { type: "LOAD_PRESET"; schema: Schema }
  | { type: "RESET" };

export interface DataForgeState {
  schema: Schema;
  generatedData: GeneratedData | null;
  generationProgress: GenerationProgress;
  exportFormat: ExportFormat;
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
    nullable: false,
    isPrimaryKey: false,
  };
}

// Create default table
export function createDefaultTable(): Table {
  const tableId = generateId();
  return {
    id: tableId,
    name: `table_${tableId.substring(0, 4)}`,
    definition: "",
    columns: [
      {
        id: generateId(),
        name: "id",
        type: "uuid",
        nullable: false,
        isPrimaryKey: true,
      },
    ],
    rowCount: 10,
  };
}

// Initial state
export const initialState: DataForgeState = {
  schema: {
    tables: [],
    foreignKeys: [],
  },
  generatedData: null,
  generationProgress: {
    status: "idle",
    tablesCompleted: 0,
    totalTables: 0,
    modelLoadProgress: 0,
  },
  exportFormat: "sql",
};

// Example preset schemas
export const PRESET_SCHEMAS: { name: string; schema: Schema }[] = [
  {
    name: "E-commerce",
    schema: {
      tables: [
        {
          id: "users",
          name: "users",
          definition: "Registered customers of an online electronics store",
          columns: [
            { id: "u1", name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
            { id: "u2", name: "name", type: "string", nullable: false, isPrimaryKey: false },
            { id: "u3", name: "email", type: "email", nullable: false, isPrimaryKey: false },
            { id: "u4", name: "created_at", type: "date", nullable: false, isPrimaryKey: false },
          ],
          rowCount: 10,
        },
        {
          id: "products",
          name: "products",
          definition: "Electronics and gadgets available for purchase",
          columns: [
            { id: "p1", name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
            { id: "p2", name: "name", type: "string", nullable: false, isPrimaryKey: false },
            { id: "p3", name: "price", type: "float", nullable: false, isPrimaryKey: false },
            { id: "p4", name: "in_stock", type: "boolean", nullable: false, isPrimaryKey: false },
          ],
          rowCount: 15,
        },
        {
          id: "orders",
          name: "orders",
          definition: "Customer purchases with order totals and dates",
          columns: [
            { id: "o1", name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
            { id: "o2", name: "user_id", type: "uuid", nullable: false, isPrimaryKey: false },
            { id: "o3", name: "total", type: "float", nullable: false, isPrimaryKey: false },
            { id: "o4", name: "order_date", type: "date", nullable: false, isPrimaryKey: false },
          ],
          rowCount: 25,
        },
      ],
      foreignKeys: [
        {
          id: "fk1",
          sourceTableId: "orders",
          sourceColumnId: "o2",
          targetTableId: "users",
          targetColumnId: "u1",
        },
      ],
    },
  },
  {
    name: "Blog",
    schema: {
      tables: [
        {
          id: "authors",
          name: "authors",
          definition: "Tech blog writers and content creators",
          columns: [
            { id: "a1", name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
            { id: "a2", name: "name", type: "string", nullable: false, isPrimaryKey: false },
            { id: "a3", name: "email", type: "email", nullable: false, isPrimaryKey: false },
            { id: "a4", name: "bio", type: "text", nullable: true, isPrimaryKey: false },
          ],
          rowCount: 5,
        },
        {
          id: "posts",
          name: "posts",
          definition: "Programming tutorials and tech articles",
          columns: [
            { id: "p1", name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
            { id: "p2", name: "author_id", type: "uuid", nullable: false, isPrimaryKey: false },
            { id: "p3", name: "title", type: "string", nullable: false, isPrimaryKey: false },
            { id: "p4", name: "content", type: "text", nullable: false, isPrimaryKey: false },
            { id: "p5", name: "published", type: "boolean", nullable: false, isPrimaryKey: false },
            { id: "p6", name: "created_at", type: "date", nullable: false, isPrimaryKey: false },
          ],
          rowCount: 20,
        },
        {
          id: "comments",
          name: "comments",
          definition: "Reader comments and feedback on blog posts",
          columns: [
            { id: "c1", name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
            { id: "c2", name: "post_id", type: "uuid", nullable: false, isPrimaryKey: false },
            { id: "c3", name: "author_name", type: "string", nullable: false, isPrimaryKey: false },
            { id: "c4", name: "content", type: "text", nullable: false, isPrimaryKey: false },
            { id: "c5", name: "created_at", type: "date", nullable: false, isPrimaryKey: false },
          ],
          rowCount: 50,
        },
      ],
      foreignKeys: [
        {
          id: "fk1",
          sourceTableId: "posts",
          sourceColumnId: "p2",
          targetTableId: "authors",
          targetColumnId: "a1",
        },
        {
          id: "fk2",
          sourceTableId: "comments",
          sourceColumnId: "c2",
          targetTableId: "posts",
          targetColumnId: "p1",
        },
      ],
    },
  },
];
