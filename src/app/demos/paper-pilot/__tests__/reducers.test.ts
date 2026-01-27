import { describe, it, expect } from "vitest";
import { paperPilotReducer } from "../reducers";
import { initialState, type PaperPilotState, type Paper, type Summary, type QAExchange } from "../types";

const mockPaper: Paper = {
  doi: "10.1234/test",
  title: "Test Paper",
  authors: ["Test Author"],
  abstract: "Test abstract",
  publishedDate: "2024-01-01",
  journal: "Test Journal",
  fullText: "Full text content",
  pdfUrl: null,
  citations: null,
  references: null,
};

const mockSummary: Summary = {
  type: "tldr",
  content: "Test summary content",
  generatedAt: new Date(),
};

const mockQA: QAExchange = {
  id: "qa-1",
  question: "Test question?",
  answer: "Test answer.",
  timestamp: new Date(),
};

describe("paperPilotReducer", () => {
  describe("SET_PAPER", () => {
    it("sets the paper and clears summaries and QA", () => {
      const stateWithData: PaperPilotState = {
        ...initialState,
        summaries: [mockSummary],
        qaHistory: [mockQA],
      };

      const result = paperPilotReducer(stateWithData, {
        type: "SET_PAPER",
        paper: mockPaper,
      });

      expect(result.paper).toEqual(mockPaper);
      expect(result.summaries).toHaveLength(0);
      expect(result.qaHistory).toHaveLength(0);
      expect(result.fetchProgress.status).toBe("complete");
    });
  });

  describe("CLEAR_PAPER", () => {
    it("clears paper, summaries, and QA", () => {
      const stateWithPaper: PaperPilotState = {
        ...initialState,
        paper: mockPaper,
        summaries: [mockSummary],
        qaHistory: [mockQA],
      };

      const result = paperPilotReducer(stateWithPaper, { type: "CLEAR_PAPER" });

      expect(result.paper).toBeNull();
      expect(result.summaries).toHaveLength(0);
      expect(result.qaHistory).toHaveLength(0);
      expect(result.fetchProgress.status).toBe("idle");
    });
  });

  describe("ADD_SUMMARY", () => {
    it("adds a new summary", () => {
      const result = paperPilotReducer(initialState, {
        type: "ADD_SUMMARY",
        summary: mockSummary,
      });

      expect(result.summaries).toHaveLength(1);
      expect(result.summaries[0]).toEqual(mockSummary);
    });

    it("replaces existing summary of the same type", () => {
      const stateWithSummary: PaperPilotState = {
        ...initialState,
        summaries: [mockSummary],
      };

      const newSummary: Summary = {
        type: "tldr",
        content: "Updated summary",
        generatedAt: new Date(),
      };

      const result = paperPilotReducer(stateWithSummary, {
        type: "ADD_SUMMARY",
        summary: newSummary,
      });

      expect(result.summaries).toHaveLength(1);
      expect(result.summaries[0].content).toBe("Updated summary");
    });

    it("adds different summary types", () => {
      let state = paperPilotReducer(initialState, {
        type: "ADD_SUMMARY",
        summary: mockSummary,
      });

      const technicalSummary: Summary = {
        type: "technical",
        content: "Technical content",
        generatedAt: new Date(),
      };

      state = paperPilotReducer(state, {
        type: "ADD_SUMMARY",
        summary: technicalSummary,
      });

      expect(state.summaries).toHaveLength(2);
    });
  });

  describe("CLEAR_SUMMARIES", () => {
    it("clears all summaries", () => {
      const stateWithSummaries: PaperPilotState = {
        ...initialState,
        summaries: [mockSummary],
      };

      const result = paperPilotReducer(stateWithSummaries, { type: "CLEAR_SUMMARIES" });

      expect(result.summaries).toHaveLength(0);
    });
  });

  describe("ADD_QA", () => {
    it("adds QA to the beginning of history", () => {
      const result = paperPilotReducer(initialState, {
        type: "ADD_QA",
        qa: mockQA,
      });

      expect(result.qaHistory).toHaveLength(1);
      expect(result.qaHistory[0]).toEqual(mockQA);
    });

    it("prepends new QA to existing history", () => {
      const stateWithQA: PaperPilotState = {
        ...initialState,
        qaHistory: [mockQA],
      };

      const newQA: QAExchange = {
        id: "qa-2",
        question: "New question?",
        answer: "New answer.",
        timestamp: new Date(),
      };

      const result = paperPilotReducer(stateWithQA, {
        type: "ADD_QA",
        qa: newQA,
      });

      expect(result.qaHistory).toHaveLength(2);
      expect(result.qaHistory[0].id).toBe("qa-2");
      expect(result.qaHistory[1].id).toBe("qa-1");
    });
  });

  describe("CLEAR_QA", () => {
    it("clears all QA history", () => {
      const stateWithQA: PaperPilotState = {
        ...initialState,
        qaHistory: [mockQA],
      };

      const result = paperPilotReducer(stateWithQA, { type: "CLEAR_QA" });

      expect(result.qaHistory).toHaveLength(0);
    });
  });

  describe("SET_GENERATION_PROGRESS", () => {
    it("updates generation progress", () => {
      const result = paperPilotReducer(initialState, {
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "generating" },
      });

      expect(result.generationProgress.status).toBe("generating");
    });

    it("sets error message", () => {
      const result = paperPilotReducer(initialState, {
        type: "SET_GENERATION_PROGRESS",
        progress: { status: "error", error: "API failed" },
      });

      expect(result.generationProgress.status).toBe("error");
      expect(result.generationProgress.error).toBe("API failed");
    });
  });

  describe("SET_FETCH_PROGRESS", () => {
    it("updates fetch progress", () => {
      const result = paperPilotReducer(initialState, {
        type: "SET_FETCH_PROGRESS",
        progress: { status: "fetching", currentStep: "Fetching from CrossRef..." },
      });

      expect(result.fetchProgress.status).toBe("fetching");
      expect(result.fetchProgress.currentStep).toBe("Fetching from CrossRef...");
    });
  });

  describe("RESET", () => {
    it("resets to initial state", () => {
      const modifiedState: PaperPilotState = {
        ...initialState,
        paper: mockPaper,
        summaries: [mockSummary],
        qaHistory: [mockQA],
      };

      const result = paperPilotReducer(modifiedState, { type: "RESET" });

      expect(result).toEqual(initialState);
    });
  });
});
