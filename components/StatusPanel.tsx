'use client';

import React from 'react';

/**
 * StatusPanel - A status bar component for the Notepad application.
 * Displays cursor position (line/column), word count, character count,
 * current file format, word wrap status, and encoding information.
 */

export interface StatusPanelProps {
  /** Current line number (1-based) */
  line: number;
  /** Current column number (1-based) */
  column: number;
  /** Total number of lines in the document */
  totalLines: number;
  /** Total character count */
  charCount: number;
  /** Total word count */
  wordCount: number;
  /** Whether word wrap is enabled */
  wordWrap: boolean;
  /** Current file format (e.g. 'txt', 'rtf') */
  fileFormat: string;
  /** Whether the document has unsaved changes */
  isDirty: boolean;
  /** Current file name (without path) */
  fileName: string;
  /** Whether a find/replace operation is active */
  findActive?: boolean;
  /** Number of find matches */
  matchCount?: number;
  /** Current match index (1-based) */
  currentMatch?: number;
  /** Optional CSS class override */
  className?: string;
}

/**
 * Formats a number with locale-aware thousands separators.
 */
function formatNumber(n: number): string {
  return n.toLocaleString();
}

/**
 * StatusPanel renders a fixed bottom bar with document statistics and state.
 */
export default function StatusPanel({
  line,
  column,
  totalLines,
  charCount,
  wordCount,
  wordWrap,
  fileFormat,
  isDirty,
  fileName,
  findActive = false,
  matchCount = 0,
  currentMatch = 0,
  className = '',
}: StatusPanelProps) {
  return (
    <footer
      role="status"
      aria-label="Document status"
      className={[
        'flex items-center justify-between',
        'bg-gray-100 dark:bg-gray-800',
        'border-t border-gray-200 dark:border-gray-700',
        'px-3 py-1 text-xs',
        'text-gray-600 dark:text-gray-400',
        'select-none shrink-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left section: file info */}
      <div className="flex items-center gap-3">
        {/* Dirty indicator */}
        <span
          aria-label={isDirty ? 'Unsaved changes' : 'All changes saved'}
          title={isDirty ? 'Unsaved changes' : 'All changes saved'}
          className={[
            'inline-flex items-center gap-1 font-medium',
            isDirty
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-green-600 dark:text-green-400',
          ].join(' ')}
        >
          <span
            className={[
              'w-1.5 h-1.5 rounded-full',
              isDirty ? 'bg-amber-500' : 'bg-green-500',
            ].join(' ')}
          />
          {isDirty ? 'Modified' : 'Saved'}
        </span>

        {/* File name */}
        <span
          className="hidden sm:inline truncate max-w-[160px] text-gray-700 dark:text-gray-300 font-medium"
          title={fileName}
        >
          {fileName || 'Untitled'}
        </span>

        {/* Format badge */}
        <span
          className="uppercase tracking-wide font-semibold text-blue-600 dark:text-blue-400"
          title={`File format: .${fileFormat}`}
        >
          .{fileFormat}
        </span>
      </div>

      {/* Center section: find/replace status */}
      {findActive && matchCount > 0 && (
        <div
          aria-live="polite"
          className="hidden md:flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {currentMatch} / {matchCount} matches
        </div>
      )}
      {findActive && matchCount === 0 && (
        <div
          aria-live="polite"
          className="hidden md:flex items-center gap-1 text-red-500 dark:text-red-400 font-medium"
        >
          No matches found
        </div>
      )}

      {/* Right section: document stats */}
      <div className="flex items-center gap-3">
        {/* Word wrap indicator */}
        <span
          title={`Word wrap is ${wordWrap ? 'on' : 'off'}`}
          className={[
            'hidden sm:inline',
            wordWrap
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-gray-400 dark:text-gray-600',
          ].join(' ')}
        >
          Wrap {wordWrap ? 'On' : 'Off'}
        </span>

        {/* Word count */}
        <span title={`${formatNumber(wordCount)} words`}>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-600 mr-0.5">
            W:
          </span>
          {formatNumber(wordCount)}
        </span>

        {/* Character count */}
        <span title={`${formatNumber(charCount)} characters`}>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-600 mr-0.5">
            Ch:
          </span>
          {formatNumber(charCount)}
        </span>

        {/* Total lines */}
        <span title={`${formatNumber(totalLines)} lines total`}>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-600 mr-0.5">
            Ln:
          </span>
          {formatNumber(totalLines)}
        </span>

        {/* Cursor position */}
        <span
          aria-label={`Line ${line}, Column ${column}`}
          title="Cursor position (Line, Column)"
          className="font-mono font-semibold text-gray-700 dark:text-gray-300 tabular-nums"
        >
          {line}:{column}
        </span>

        {/* Encoding */}
        <span
          className="hidden lg:inline text-gray-400 dark:text-gray-600"
          title="Text encoding"
        >
          UTF-8
        </span>
      </div>
    </footer>
  );
}
