"use client";

import { useState } from "react";
import type { QAExchange } from "../types";

interface QAPanelProps {
  qaHistory: QAExchange[];
  isModelReady: boolean;
  isGenerating: boolean;
  onAskQuestion: (question: string) => Promise<void>;
}

export default function QAPanel({
  qaHistory,
  isModelReady,
  isGenerating,
  onAskQuestion,
}: QAPanelProps) {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !isModelReady || isGenerating) return;

    setIsAsking(true);
    try {
      await onAskQuestion(question.trim());
      setQuestion("");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="font-medium mb-4">Ask About This Paper</h3>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isModelReady
                ? "Ask a question about the paper..."
                : "Load a model to ask questions"
            }
            disabled={!isModelReady || isAsking}
            className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isModelReady || isAsking || !question.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              isModelReady && !isAsking && question.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {isAsking ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Thinking
              </span>
            ) : (
              "Ask"
            )}
          </button>
        </div>
      </form>

      {qaHistory.length > 0 && (
        <div className="space-y-4">
          {qaHistory.map((qa) => (
            <div
              key={qa.id}
              className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg"
            >
              <div className="mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Question
                </span>
                <p className="text-sm font-medium">{qa.question}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Answer
                </span>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {qa.answer}
                </p>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                {qa.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {qaHistory.length === 0 && isModelReady && (
        <p className="text-sm text-neutral-500 italic">
          No questions asked yet. Try asking about the methodology, findings, or implications.
        </p>
      )}
    </div>
  );
}
