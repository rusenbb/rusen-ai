import { describe, it, expect } from "vitest";
import { dataForgeReducer } from "../reducers";
import { initialState, type DataForgeState } from "../types";

describe("dataForgeReducer", () => {
  describe("ADD_TABLE", () => {
    it("adds a new table to the schema", () => {
      const result = dataForgeReducer(initialState, { type: "ADD_TABLE" });

      expect(result.schema.tables).toHaveLength(1);
      expect(result.schema.tables[0]).toHaveProperty("id");
      expect(result.schema.tables[0]).toHaveProperty("name");
      expect(result.schema.tables[0].columns).toHaveLength(1);
      expect(result.generatedData).toBeNull();
    });

    it("preserves existing tables when adding new one", () => {
      const stateWithTable = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const result = dataForgeReducer(stateWithTable, { type: "ADD_TABLE" });

      expect(result.schema.tables).toHaveLength(2);
    });
  });

  describe("UPDATE_TABLE", () => {
    it("updates table name", () => {
      const stateWithTable = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;

      const result = dataForgeReducer(stateWithTable, {
        type: "UPDATE_TABLE",
        tableId,
        updates: { name: "users" },
      });

      expect(result.schema.tables[0].name).toBe("users");
      expect(result.generatedData).toBeNull();
    });

    it("updates row count", () => {
      const stateWithTable = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;

      const result = dataForgeReducer(stateWithTable, {
        type: "UPDATE_TABLE",
        tableId,
        updates: { rowCount: 100 },
      });

      expect(result.schema.tables[0].rowCount).toBe(100);
    });
  });

  describe("DELETE_TABLE", () => {
    it("removes the specified table", () => {
      const stateWithTable = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;

      const result = dataForgeReducer(stateWithTable, {
        type: "DELETE_TABLE",
        tableId,
      });

      expect(result.schema.tables).toHaveLength(0);
      expect(result.generatedData).toBeNull();
    });

    it("removes related foreign keys when table is deleted", () => {
      let state = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      state = dataForgeReducer(state, { type: "ADD_TABLE" });
      const table1Id = state.schema.tables[0].id;
      const table2Id = state.schema.tables[1].id;
      const col1Id = state.schema.tables[0].columns[0].id;
      const col2Id = state.schema.tables[1].columns[0].id;

      state = dataForgeReducer(state, {
        type: "ADD_FOREIGN_KEY",
        foreignKey: {
          sourceTableId: table1Id,
          sourceColumnId: col1Id,
          targetTableId: table2Id,
          targetColumnId: col2Id,
        },
      });

      expect(state.schema.foreignKeys).toHaveLength(1);

      const result = dataForgeReducer(state, {
        type: "DELETE_TABLE",
        tableId: table1Id,
      });

      expect(result.schema.foreignKeys).toHaveLength(0);
    });
  });

  describe("ADD_COLUMN", () => {
    it("adds a column to the specified table", () => {
      const stateWithTable = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;
      const initialColumnCount = stateWithTable.schema.tables[0].columns.length;

      const result = dataForgeReducer(stateWithTable, {
        type: "ADD_COLUMN",
        tableId,
      });

      expect(result.schema.tables[0].columns).toHaveLength(initialColumnCount + 1);
      expect(result.generatedData).toBeNull();
    });
  });

  describe("UPDATE_COLUMN", () => {
    it("updates column properties", () => {
      const stateWithTable = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const tableId = stateWithTable.schema.tables[0].id;
      const columnId = stateWithTable.schema.tables[0].columns[0].id;

      const result = dataForgeReducer(stateWithTable, {
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
      let state = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      const tableId = state.schema.tables[0].id;

      state = dataForgeReducer(state, { type: "ADD_COLUMN", tableId });
      const columnToDelete = state.schema.tables[0].columns[1].id;

      const result = dataForgeReducer(state, {
        type: "DELETE_COLUMN",
        tableId,
        columnId: columnToDelete,
      });

      expect(result.schema.tables[0].columns).toHaveLength(1);
    });

    it("removes related foreign keys when column is deleted", () => {
      let state = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      state = dataForgeReducer(state, { type: "ADD_TABLE" });
      const table1Id = state.schema.tables[0].id;
      const table2Id = state.schema.tables[1].id;
      const col1Id = state.schema.tables[0].columns[0].id;
      const col2Id = state.schema.tables[1].columns[0].id;

      state = dataForgeReducer(state, {
        type: "ADD_FOREIGN_KEY",
        foreignKey: {
          sourceTableId: table1Id,
          sourceColumnId: col1Id,
          targetTableId: table2Id,
          targetColumnId: col2Id,
        },
      });

      const result = dataForgeReducer(state, {
        type: "DELETE_COLUMN",
        tableId: table1Id,
        columnId: col1Id,
      });

      expect(result.schema.foreignKeys).toHaveLength(0);
    });
  });

  describe("ADD_FOREIGN_KEY", () => {
    it("adds a foreign key relationship", () => {
      let state = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      state = dataForgeReducer(state, { type: "ADD_TABLE" });
      const table1Id = state.schema.tables[0].id;
      const table2Id = state.schema.tables[1].id;
      const col1Id = state.schema.tables[0].columns[0].id;
      const col2Id = state.schema.tables[1].columns[0].id;

      const result = dataForgeReducer(state, {
        type: "ADD_FOREIGN_KEY",
        foreignKey: {
          sourceTableId: table1Id,
          sourceColumnId: col1Id,
          targetTableId: table2Id,
          targetColumnId: col2Id,
        },
      });

      expect(result.schema.foreignKeys).toHaveLength(1);
      expect(result.schema.foreignKeys[0]).toHaveProperty("id");
      expect(result.schema.foreignKeys[0].sourceTableId).toBe(table1Id);
    });
  });

  describe("DELETE_FOREIGN_KEY", () => {
    it("removes the specified foreign key", () => {
      let state = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      state = dataForgeReducer(state, { type: "ADD_TABLE" });
      const table1Id = state.schema.tables[0].id;
      const table2Id = state.schema.tables[1].id;
      const col1Id = state.schema.tables[0].columns[0].id;
      const col2Id = state.schema.tables[1].columns[0].id;

      state = dataForgeReducer(state, {
        type: "ADD_FOREIGN_KEY",
        foreignKey: {
          sourceTableId: table1Id,
          sourceColumnId: col1Id,
          targetTableId: table2Id,
          targetColumnId: col2Id,
        },
      });

      const fkId = state.schema.foreignKeys[0].id;

      const result = dataForgeReducer(state, {
        type: "DELETE_FOREIGN_KEY",
        foreignKeyId: fkId,
      });

      expect(result.schema.foreignKeys).toHaveLength(0);
    });
  });

  describe("SET_GENERATED_DATA", () => {
    it("sets generated data and marks complete", () => {
      const mockData = { users: [{ id: 1, name: "John" }] };

      const result = dataForgeReducer(initialState, {
        type: "SET_GENERATED_DATA",
        data: mockData,
      });

      expect(result.generatedData).toEqual(mockData);
      expect(result.generationProgress.status).toBe("complete");
    });
  });

  describe("CLEAR_GENERATED_DATA", () => {
    it("clears generated data", () => {
      const stateWithData: DataForgeState = {
        ...initialState,
        generatedData: { users: [] },
        generationProgress: { status: "complete", currentTable: "", tablesCompleted: 1, totalTables: 1 },
      };

      const result = dataForgeReducer(stateWithData, {
        type: "CLEAR_GENERATED_DATA",
      });

      expect(result.generatedData).toBeNull();
      expect(result.generationProgress.status).toBe("idle");
    });
  });

  describe("SET_GENERATION_PROGRESS", () => {
    it("updates generation progress", () => {
      const result = dataForgeReducer(initialState, {
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating", currentTable: "users", tablesCompleted: 0, totalTables: 2 },
      });

      expect(result.generationProgress.status).toBe("generating");
      expect(result.generationProgress.currentTable).toBe("users");
    });
  });

  describe("SET_EXPORT_FORMAT", () => {
    it("changes the export format", () => {
      const result = dataForgeReducer(initialState, {
        type: "SET_EXPORT_FORMAT",
        format: "csv",
      });

      expect(result.exportFormat).toBe("csv");
    });
  });

  describe("RESET", () => {
    it("resets to initial state", () => {
      let state = dataForgeReducer(initialState, { type: "ADD_TABLE" });
      state = dataForgeReducer(state, {
        type: "SET_GENERATED_DATA",
        data: { test: [] },
      });

      const result = dataForgeReducer(state, { type: "RESET" });

      expect(result).toEqual(initialState);
    });
  });
});
