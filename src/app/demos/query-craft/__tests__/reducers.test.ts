import { describe, it, expect } from "vitest";
import { queryCraftReducer } from "../reducers";
import { initialState, PRESET_SCHEMAS, type QueryCraftState } from "../types";

describe("queryCraftReducer", () => {
  describe("ADD_TABLE", () => {
    it("adds a new table to the schema", () => {
      const result = queryCraftReducer(initialState, { type: "ADD_TABLE" });

      expect(result.schema.tables).toHaveLength(1);
      expect(result.schema.tables[0]).toHaveProperty("id");
      expect(result.schema.tables[0]).toHaveProperty("name");
      expect(result.schema.tables[0].columns).toHaveLength(1);
      expect(result.schema.tables[0].columns[0].isPrimaryKey).toBe(true);
    });

    it("preserves existing tables when adding new one", () => {
      const stateWithTable = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const result = queryCraftReducer(stateWithTable, { type: "ADD_TABLE" });

      expect(result.schema.tables).toHaveLength(2);
    });
  });

  describe("UPDATE_TABLE", () => {
    it("updates table name", () => {
      const stateWithTable = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;

      const result = queryCraftReducer(stateWithTable, {
        type: "UPDATE_TABLE",
        tableId,
        updates: { name: "users" },
      });

      expect(result.schema.tables[0].name).toBe("users");
    });

    it("updates table description", () => {
      const stateWithTable = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;

      const result = queryCraftReducer(stateWithTable, {
        type: "UPDATE_TABLE",
        tableId,
        updates: { description: "User accounts" },
      });

      expect(result.schema.tables[0].description).toBe("User accounts");
    });

    it("does not modify other tables", () => {
      let state = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      state = queryCraftReducer(state, { type: "ADD_TABLE" });
      const firstTableId = state.schema.tables[0].id;
      const firstTableName = state.schema.tables[0].name;

      const result = queryCraftReducer(state, {
        type: "UPDATE_TABLE",
        tableId: state.schema.tables[1].id,
        updates: { name: "orders" },
      });

      expect(result.schema.tables[0].id).toBe(firstTableId);
      expect(result.schema.tables[0].name).toBe(firstTableName);
      expect(result.schema.tables[1].name).toBe("orders");
    });
  });

  describe("DELETE_TABLE", () => {
    it("removes the specified table", () => {
      const stateWithTable = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;

      const result = queryCraftReducer(stateWithTable, {
        type: "DELETE_TABLE",
        tableId,
      });

      expect(result.schema.tables).toHaveLength(0);
    });

    it("preserves other tables", () => {
      let state = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      state = queryCraftReducer(state, { type: "ADD_TABLE" });
      const firstTableId = state.schema.tables[0].id;

      const result = queryCraftReducer(state, {
        type: "DELETE_TABLE",
        tableId: state.schema.tables[1].id,
      });

      expect(result.schema.tables).toHaveLength(1);
      expect(result.schema.tables[0].id).toBe(firstTableId);
    });
  });

  describe("ADD_COLUMN", () => {
    it("adds a column to the specified table", () => {
      const stateWithTable = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;
      const initialColumnCount = stateWithTable.schema.tables[0].columns.length;

      const result = queryCraftReducer(stateWithTable, {
        type: "ADD_COLUMN",
        tableId,
      });

      expect(result.schema.tables[0].columns).toHaveLength(initialColumnCount + 1);
    });
  });

  describe("UPDATE_COLUMN", () => {
    it("updates column properties", () => {
      const stateWithTable = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;
      const columnId = stateWithTable.schema.tables[0].columns[0].id;

      const result = queryCraftReducer(stateWithTable, {
        type: "UPDATE_COLUMN",
        tableId,
        columnId,
        updates: { name: "user_id", type: "integer" },
      });

      expect(result.schema.tables[0].columns[0].name).toBe("user_id");
      expect(result.schema.tables[0].columns[0].type).toBe("integer");
    });
  });

  describe("DELETE_COLUMN", () => {
    it("removes the specified column", () => {
      let state = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      const tableId = state.schema.tables[0].id;

      // Add another column first
      state = queryCraftReducer(state, { type: "ADD_COLUMN", tableId });
      const columnToDelete = state.schema.tables[0].columns[1].id;

      const result = queryCraftReducer(state, {
        type: "DELETE_COLUMN",
        tableId,
        columnId: columnToDelete,
      });

      expect(result.schema.tables[0].columns).toHaveLength(1);
    });
  });

  describe("SET_DIALECT", () => {
    it("changes the SQL dialect", () => {
      const result = queryCraftReducer(initialState, {
        type: "SET_DIALECT",
        dialect: "mysql",
      });

      expect(result.schema.dialect).toBe("mysql");
    });
  });

  describe("SET_QUERY", () => {
    it("updates the query string", () => {
      const result = queryCraftReducer(initialState, {
        type: "SET_QUERY",
        query: "Get all users",
      });

      expect(result.query).toBe("Get all users");
    });
  });

  describe("SET_GENERATED_SQL", () => {
    it("sets the generated SQL and adds to history", () => {
      const stateWithQuery: QueryCraftState = {
        ...initialState,
        query: "Get all users",
      };

      const result = queryCraftReducer(stateWithQuery, {
        type: "SET_GENERATED_SQL",
        sql: "SELECT * FROM users;",
        explanation: "Selects all columns from users table",
      });

      expect(result.generatedSQL).toBe("SELECT * FROM users;");
      expect(result.explanation).toBe("Selects all columns from users table");
      expect(result.generationProgress.status).toBe("complete");
      expect(result.history).toHaveLength(1);
      expect(result.history[0].sql).toBe("SELECT * FROM users;");
      expect(result.history[0].naturalLanguage).toBe("Get all users");
    });

    it("limits history to 10 items", () => {
      let state: QueryCraftState = { ...initialState, query: "test" };

      // Add 12 history items
      for (let i = 0; i < 12; i++) {
        state = queryCraftReducer(state, {
          type: "SET_GENERATED_SQL",
          sql: `SELECT ${i}`,
        });
      }

      expect(state.history).toHaveLength(10);
    });
  });

  describe("CLEAR_GENERATED_SQL", () => {
    it("clears generated SQL and explanation", () => {
      const stateWithSQL: QueryCraftState = {
        ...initialState,
        generatedSQL: "SELECT * FROM users;",
        explanation: "Some explanation",
        generationProgress: { status: "complete" },
      };

      const result = queryCraftReducer(stateWithSQL, {
        type: "CLEAR_GENERATED_SQL",
      });

      expect(result.generatedSQL).toBeNull();
      expect(result.explanation).toBeNull();
      expect(result.generationProgress.status).toBe("idle");
    });
  });

  describe("SET_GENERATION_PROGRESS", () => {
    it("updates generation progress", () => {
      const result = queryCraftReducer(initialState, {
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating" },
      });

      expect(result.generationProgress.status).toBe("generating");
    });

    it("sets error message", () => {
      const result = queryCraftReducer(initialState, {
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "error", error: "API failed" },
      });

      expect(result.generationProgress.status).toBe("error");
      expect(result.generationProgress.error).toBe("API failed");
    });
  });

  describe("CLEAR_HISTORY", () => {
    it("clears all history", () => {
      let state = queryCraftReducer(
        { ...initialState, query: "test" },
        { type: "SET_GENERATED_SQL", sql: "SELECT 1" }
      );

      const result = queryCraftReducer(state, { type: "CLEAR_HISTORY" });

      expect(result.history).toHaveLength(0);
    });
  });

  describe("LOAD_PRESET", () => {
    it("loads a preset schema", () => {
      const preset = PRESET_SCHEMAS[0].schema;

      const result = queryCraftReducer(initialState, {
        type: "LOAD_PRESET",
        schema: preset,
      });

      expect(result.schema).toEqual(preset);
      expect(result.generatedSQL).toBeNull();
      expect(result.query).toBe("");
      expect(result.generationProgress.status).toBe("idle");
    });
  });

  describe("RESET", () => {
    it("resets to initial state", () => {
      let state = queryCraftReducer(initialState, { type: "ADD_TABLE" });
      state = queryCraftReducer(state, { type: "SET_QUERY", query: "test" });

      const result = queryCraftReducer(state, { type: "RESET" });

      expect(result).toEqual(initialState);
    });
  });
});
