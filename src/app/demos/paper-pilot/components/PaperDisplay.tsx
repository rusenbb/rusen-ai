"use client";

import { useState } from "react";
import type { PaperMetadata, ContentSource } from "../types";
import { generateBibTeX } from "../utils/citations";

interface PaperDisplayProps {
  paper: PaperMetadata;
  onClear: () => void;
}

const SOURCE_LABELS: Record<ContentSource, { name: string; color: string }> = {
  crossref: { name: "CrossRef", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  unpaywall: { name: "Unpaywall", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  semanticscholar: { name: "Semantic Scholar", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  arxiv: { name: "arXiv", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  "pdf-upload": { name: "Uploaded PDF", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300" },
};

export default function PaperDisplay({ paper, onClear }: PaperDisplayProps) {
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const handleCopyBibTeX = async () => {
    const bibtex = generateBibTeX(paper);
    await navigator.clipboard.writeText(bibtex);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <div className="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold leading-tight">{paper.title}</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Copy BibTeX button */}
          <button
            onClick={handleCopyBibTeX}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-neutral-400 transition"
            title={copiedBibtex ? "Copied!" : "Copy BibTeX"}
          >
            {copiedBibtex ? (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </button>
          {/* Clear button */}
          <button
            onClick={onClear}
            className="px-3 py-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-neutral-400 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Sources badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {paper.sources.map((source, index) => (
          <span
            key={index}
            className={`px-2 py-0.5 text-xs rounded ${SOURCE_LABELS[source.source].color}`}
          >
            {SOURCE_LABELS[source.source].name}
            {source.hasFullText && " (PDF)"}
          </span>
        ))}
        {paper.hasFullText && (
          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded font-medium">
            Full Text Available
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        <p>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Authors:</span>{" "}
          {paper.authors.join(", ")}
        </p>

        {paper.journal && (
          <p>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Journal:</span>{" "}
            {paper.journal}
          </p>
        )}

        {paper.publishedDate && (
          <p>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Published:</span>{" "}
            {paper.publishedDate}
          </p>
        )}

        {/* Identifiers */}
        <div className="flex flex-wrap gap-4">
          {paper.doi && (
            <p>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">DOI:</span>{" "}
              <a
                href={`https://doi.org/${paper.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {paper.doi}
              </a>
            </p>
          )}
          {paper.arxivId && (
            <p>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">arXiv:</span>{" "}
              <a
                href={`https://arxiv.org/abs/${paper.arxivId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {paper.arxivId}
              </a>
            </p>
          )}
        </div>

        {/* Word count */}
        <p className="text-xs text-neutral-400">
          {paper.wordCount.toLocaleString()} words available for analysis
          {paper.hasFullText ? " (full text)" : " (abstract only)"}
        </p>
      </div>

      {paper.subjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {paper.subjects.slice(0, 6).map((subject, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded"
            >
              {subject}
            </span>
          ))}
        </div>
      )}

      {paper.abstract ? (
        <div>
          <h3 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Abstract</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {paper.abstract}
          </p>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            No abstract available. AI summaries will be based on title and metadata only.
          </p>
        </div>
      )}

      {/* Full text indicator */}
      {paper.hasFullText && paper.fullTextSource && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            <strong>Full text extracted</strong> from {SOURCE_LABELS[paper.fullTextSource].name} PDF.
            AI can analyze the complete paper content.
          </p>
          {/* PDF extraction warning */}
          {paper.totalPages && paper.pagesExtracted && paper.totalPages > paper.pagesExtracted && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Note: First {paper.pagesExtracted} of {paper.totalPages} pages extracted. Some content may be missing.
            </p>
          )}
        </div>
      )}

      {/* PDF links */}
      {paper.sources.some(s => s.pdfUrl) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {paper.sources
            .filter(s => s.pdfUrl)
            .map((source, index) => (
              <a
                key={index}
                href={source.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF ({SOURCE_LABELS[source.source].name})
                {source.license && <span className="text-xs text-neutral-500 ml-1">({source.license})</span>}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
