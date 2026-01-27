"use client";

import { useState, useEffect } from "react";
import { Spinner, Button } from "@/components/ui";
import type { QAExchange } from "../types";

interface QAPanelProps {
  qaHistory: QAExchange[];
  isModelReady: boolean;
  isGenerating: boolean;
  streamingContent: string;
  onAskQuestion: (question: string) => Promise<void>;
  onClearQA?: () => void;
}

export default function QAPanel({
  qaHistory,
  isModelReady,
  isGenerating,
  streamingContent,
  onAskQuestion,
  onClearQA,
}: QAPanelProps) {
  const [question, setQuestion] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [waitingStage, setWaitingStage] = useState<"connecting" | "waiting" | null>(null);

  // Track generation stages for better feedback
  useEffect(() => {
    if (isAsking && !streamingContent) {
      setWaitingStage("connecting");
      const timer = setTimeout(() => {
        setWaitingStage("waiting");
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setWaitingStage(null);
    }
  }, [isAsking, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !isModelReady || isGenerating) return;

    const questionToAsk = question.trim();
    setCurrentQuestion(questionToAsk);
    setQuestion("");
    setIsAsking(true);
    try {
      await onAskQuestion(questionToAsk);
    } finally {
      setIsAsking(false);
      setCurrentQuestion("");
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Ask About This Paper</h3>
        {qaHistory.length > 0 && onClearQA && (
          <button
            onClick={onClearQA}
            disabled={isAsking}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition disabled:opacity-50"
            title="Clear history"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

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
          <Button
            type="submit"
            variant="primary"
            disabled={!isModelReady || !question.trim()}
            loading={isAsking}
          >
            {isAsking ? "Thinking" : "Ask"}
          </Button>
        </div>
      </form>

      {/* Show streaming response while generating */}
      {isAsking && currentQuestion && (
        <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
          <div className="mb-2">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Question
            </span>
            <p className="text-sm font-medium">{currentQuestion}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Answer
            </span>
            {streamingContent ? (
              <div className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {streamingContent}
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                <Spinner size="sm" color="neutral" />
                {waitingStage === "connecting" ? "Connecting to model..." : "Waiting for response..."}
              </div>
            )}
          </div>
        </div>
      )}

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
