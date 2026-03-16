/**
 * lib/mock-data.ts
 *
 * Provides self-contained sample data and helper utilities for the Notepad
 * application. This keeps the UI functional and demonstrable without requiring
 * any external API calls or file-system access (which is unavailable in a
 * browser-based Next.js environment).
 *
 * All helpers are pure functions — no side effects, no external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported file formats for the notepad */
export type FileFormat = 'txt' | 'rtf';

/** Represents an in-memory document */
export interface NotepadDocument {
  /** Unique identifier */
  id: string;
  /** Display name (without extension) */
  name: string;
  /** File format */
  format: FileFormat;
  /** Raw text content */
  content: string;
  /** ISO timestamp of last modification */
  lastModified: string;
  /** Whether the document has unsaved changes */
  isDirty: boolean;
}

/** A single entry in the undo/redo history stack */
export interface HistoryEntry {
  content: string;
  cursorLine: number;
  cursorCol: number;
}

/** Result of a find operation */
export interface FindResult {
  /** 0-based character index of the match start */
  index: number;
  /** Length of the matched string */
  length: number;
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  column: number;
}

// ---------------------------------------------------------------------------
// Sample documents
// ---------------------------------------------------------------------------

/**
 * A curated set of sample documents that ship with the app so the user
 * immediately sees a populated, functional notepad on first load.
 */
export const SAMPLE_DOCUMENTS: NotepadDocument[] = [
  {
    id: 'doc-welcome',
    name: 'Welcome',
    format: 'txt',
    lastModified: new Date().toISOString(),
    isDirty: false,
    content: `Welcome to Notepad!
===================

This is a feature-rich text editor built with Next.js and TypeScript.

Features:
  • Create, open, edit, and save text files
  • Basic text formatting (Bold, Italic, Underline)
  • Cut, Copy, Paste, Undo, Redo
  • Find & Replace with match highlighting
  • Word Wrap toggle
  • Status bar with live cursor position, word count, and character count
  • Multiple file format support (.txt, .rtf)
  • Dark mode support

Getting Started:
  1. Type or paste your text in this editor area.
  2. Use the toolbar above to format text or manage files.
  3. Press Ctrl+S (or Cmd+S on Mac) to save.
  4. Use Ctrl+F to open Find & Replace.

Keyboard Shortcuts:
  Ctrl+N        New document
  Ctrl+O        Open file
  Ctrl+S        Save
  Ctrl+Shift+S  Save As
  Ctrl+Z        Undo
  Ctrl+Y        Redo
  Ctrl+F        Find & Replace
  Ctrl+B        Bold
  Ctrl+I        Italic
  Ctrl+U        Underline

Enjoy writing!
`,
  },
  {
    id: 'doc-meeting-notes',
    name: 'Meeting Notes',
    format: 'txt',
    lastModified: new Date(Date.now() - 86_400_000).toISOString(),
    isDirty: false,
    content: `Meeting Notes — Product Sync
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Attendees: Alice, Bob, Carol, Dave

Agenda:
  1. Sprint review
  2. Roadmap discussion
  3. Action items

Sprint Review:
  - Completed 18 of 21 story points
  - Notepad feature shipped to staging ✓
  - Performance improvements: 40% faster load time
  - 3 bugs deferred to next sprint

Roadmap Discussion:
  - Q3 focus: mobile responsiveness and offline support
  - Considering PWA approach for desktop-like experience
  - RTF export to be prioritised after user feedback

Action Items:
  [ ] Alice  — Write technical spec for offline mode by Friday
  [ ] Bob    — Fix deferred bugs (issues #42, #43, #44)
  [ ] Carol  — User research interviews scheduled for next week
  [ ] Dave   — Update staging environment with latest build

Next Meeting: Same time next week.
`,
  },
  {
    id: 'doc-quick-notes',
    name: 'Quick Notes',
    format: 'txt',
    lastModified: new Date(Date.now() - 3_600_000).toISOString(),
    isDirty: false,
    content: `Quick Notes
-----------

TODO:
  - Buy groceries
  - Call dentist
  - Review PR #87
  - Update README

Ideas:
  - Dark mode toggle in status bar
  - Auto-save every 30 seconds
  - Recent files list in File menu
  - Syntax highlighting for code files

Links:
  - https://nextjs.org/docs
  - https://tailwindcss.com/docs
  - https://www.typescriptlang.org/docs/

Random thoughts:
  The best code is code you don't have to write.
  Simplicity is the ultimate sophistication.
  Make it work, make it right, make it fast.
`,
  },
  {
    id: 'doc-rtf-sample',
    name: 'RTF Sample',
    format: 'rtf',
    lastModified: new Date(Date.now() - 172_800_000).toISOString(),
    isDirty: false,
    content: `RTF Document Sample
===================

This document demonstrates RTF format support in the Notepad application.

In a full desktop implementation, RTF files would preserve rich formatting
such as bold, italic, underline, font sizes, and colours when saved to disk.

For this browser-based demo, the content is stored as plain text internally
and the .rtf extension is tracked for file-format awareness.

Sample formatted content:

  HEADING: Project Overview
  -------------------------
  This project aims to deliver a cross-platform notepad application that
  supports both plain text and rich text formats.

  Key Metrics:
    • Target load time: < 1 second
    • Supported formats: TXT, RTF
    • Max document size: 10 MB
    • Undo history depth: 100 steps

  Status: In Progress
`,
  },
];

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

/**
 * Creates a brand-new blank document with a generated ID and timestamp.
 *
 * @param name   - Optional display name (defaults to 'Untitled')
 * @param format - File format (defaults to 'txt')
 */
export function createBlankDocument(
  name = 'Untitled',
  format: FileFormat = 'txt'
): NotepadDocument {
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    format,
    content: '',
    lastModified: new Date().toISOString(),
    isDirty: false,
  };
}

/**
 * Returns a copy of the document marked as dirty (unsaved changes).
 */
export function markDirty(doc: NotepadDocument): NotepadDocument {
  return { ...doc, isDirty: true, lastModified: new Date().toISOString() };
}

/**
 * Returns a copy of the document marked as clean (saved).
 */
export function markClean(doc: NotepadDocument): NotepadDocument {
  return { ...doc, isDirty: false };
}

/**
 * Derives the full file name including extension from a document.
 *
 * @example getFileName({ name: 'Notes', format: 'txt' }) // => 'Notes.txt'
 */
export function getFileName(doc: Pick<NotepadDocument, 'name' | 'format'>): string {
  const safeName = doc.name.trim() || 'Untitled';
  // Avoid double extension if the user already typed one
  if (safeName.toLowerCase().endsWith(`.${doc.format}`)) return safeName;
  return `${safeName}.${doc.format}`;
}

// ---------------------------------------------------------------------------
// Text statistics
// ---------------------------------------------------------------------------

/**
 * Counts the number of words in a string.
 * Words are sequences of non-whitespace characters.
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Counts the total number of characters (including whitespace).
 */
export function countChars(text: string): number {
  return text.length;
}

/**
 * Counts the number of lines in a string.
 * An empty string is considered to have 1 line.
 */
export function countLines(text: string): number {
  if (text === '') return 1;
  return text.split('\n').length;
}

/**
 * Given a flat text string and a 0-based character offset, returns the
 * 1-based line and column numbers at that offset.
 *
 * @param text   - The full document text
 * @param offset - 0-based character offset (e.g. textarea.selectionStart)
 */
export function offsetToLineCol(
  text: string,
  offset: number
): { line: number; column: number } {
  // Clamp offset to valid range
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
}

// ---------------------------------------------------------------------------
// Find & Replace helpers
// ---------------------------------------------------------------------------

/**
 * Finds all occurrences of a search string within text.
 * Returns an array of FindResult objects with position information.
 *
 * @param text          - The document text to search
 * @param query         - The search string
 * @param caseSensitive - Whether the search is case-sensitive (default: false)
 * @param wholeWord     - Whether to match whole words only (default: false)
 */
export function findAll(
  text: string,
  query: string,
  caseSensitive = false,
  wholeWord = false
): FindResult[] {
  if (!query) return [];

  const results: FindResult[] = [];
  const flags = caseSensitive ? 'g' : 'gi';

  let pattern: RegExp;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundary = wholeWord ? '\\b' : '';
    pattern = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, flags);
  } catch {
    // If the pattern is somehow invalid, return no results
    return [];
  }

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const { line, column } = offsetToLineCol(text, match.index);
    results.push({
      index: match.index,
      length: match[0].length,
      line,
      column,
    });
    // Prevent infinite loop on zero-length matches
    if (match[0].length === 0) pattern.lastIndex++;
  }

  return results;
}

/**
 * Replaces a single occurrence of a search string at a given index.
 *
 * @param text        - Original document text
 * @param index       - 0-based start index of the match
 * @param matchLength - Length of the matched string
 * @param replacement - Replacement string
 */
export function replaceSingle(
  text: string,
  index: number,
  matchLength: number,
  replacement: string
): string {
  return text.slice(0, index) + replacement + text.slice(index + matchLength);
}

/**
 * Replaces all occurrences of a search string in the text.
 *
 * @param text          - Original document text
 * @param query         - Search string
 * @param replacement   - Replacement string
 * @param caseSensitive - Whether the search is case-sensitive
 * @param wholeWord     - Whether to match whole words only
 */
export function replaceAll(
  text: string,
  query: string,
  replacement: string,
  caseSensitive = false,
  wholeWord = false
): { result: string; count: number } {
  if (!query) return { result: text, count: 0 };

  const flags = caseSensitive ? 'g' : 'gi';
  let pattern: RegExp;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundary = wholeWord ? '\\b' : '';
    pattern = new RegExp(`${wordBoundary}${escaped}${wordBoundary}`, flags);
  } catch {
    return { result: text, count: 0 };
  }

  let count = 0;
  const result = text.replace(pattern, () => {
    count++;
    return replacement;
  });

  return { result, count };
}

// ---------------------------------------------------------------------------
// Undo / Redo history
// ---------------------------------------------------------------------------

/** Maximum number of undo steps to retain */
export const MAX_HISTORY_DEPTH = 100;

/**
 * Pushes a new entry onto the undo stack, discarding any redo history.
 * Enforces the maximum history depth by dropping the oldest entry.
 *
 * @param stack   - Current undo stack (oldest → newest)
 * @param entry   - New state to push
 */
export function pushHistory(
  stack: HistoryEntry[],
  entry: HistoryEntry
): HistoryEntry[] {
  const next = [...stack, entry];
  if (next.length > MAX_HISTORY_DEPTH) next.shift();
  return next;
}

// ---------------------------------------------------------------------------
// File download helper (browser-safe)
// ---------------------------------------------------------------------------

/**
 * Triggers a browser file download for the given text content.
 * This is the closest equivalent to "Save to disk" available in a
 * browser-based environment without the File System Access API.
 *
 * @param content  - Text content to save
 * @param fileName - Desired file name (e.g. 'Notes.txt')
 * @param mimeType - MIME type (defaults to 'text/plain')
 */
export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  // Clean up after a short delay to allow the download to start
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Reads a File object as text using the FileReader API.
 * Returns a Promise that resolves with the file content.
 *
 * @param file - The File object from an <input type="file"> element
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error(`FileReader error: ${reader.error?.message ?? 'unknown'}`));
    reader.readAsText(file, 'utf-8');
  });
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Extracts the file format from a file name.
 * Returns 'txt' as the fallback for unknown or missing extensions.
 *
 * @example getFormatFromName('notes.rtf') // => 'rtf'
 * @example getFormatFromName('readme')    // => 'txt'
 */
export function getFormatFromName(name: string): FileFormat {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'rtf') return 'rtf';
  return 'txt';
}

/**
 * Returns the MIME type string for a given file format.
 */
export function getMimeType(format: FileFormat): string {
  switch (format) {
    case 'rtf':
      return 'application/rtf';
    case 'txt':
    default:
      return 'text/plain;charset=utf-8';
  }
}

/**
 * Returns the accept string for a file input element.
 * Restricts selection to supported formats.
 */
export const FILE_INPUT_ACCEPT = '.txt,.rtf,text/plain,application/rtf';

// ---------------------------------------------------------------------------
// Formatting helpers (for toolbar actions)
// ---------------------------------------------------------------------------

/**
 * Wraps the selected text in a textarea with the given prefix/suffix markers.
 * Returns the new full text and the updated selection range.
 *
 * Used for bold (**), italic (*), underline (__ __) markers in plain-text mode.
 *
 * @param text       - Full document text
 * @param start      - Selection start (textarea.selectionStart)
 * @param end        - Selection end (textarea.selectionEnd)
 * @param prefix     - Marker to insert before selection
 * @param suffix     - Marker to insert after selection (defaults to prefix)
 */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix = prefix
): { text: string; selectionStart: number; selectionEnd: number } {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);
  const newText = `${before}${prefix}${selected}${suffix}${after}`;
  return {
    text: newText,
    selectionStart: start + prefix.length,
    selectionEnd: end + prefix.length,
  };
}

// ---------------------------------------------------------------------------
// Keyboard shortcut map (for documentation / help overlay)
// ---------------------------------------------------------------------------

export interface ShortcutEntry {
  keys: string;
  description: string;
  category: 'file' | 'edit' | 'format' | 'view' | 'search';
}

export const KEYBOARD_SHORTCUTS: ShortcutEntry[] = [
  // File
  { keys: 'Ctrl+N', description: 'New document', category: 'file' },
  { keys: 'Ctrl+O', description: 'Open file', category: 'file' },
  { keys: 'Ctrl+S', description: 'Save', category: 'file' },
  { keys: 'Ctrl+Shift+S', description: 'Save As', category: 'file' },
  // Edit
  { keys: 'Ctrl+Z', description: 'Undo', category: 'edit' },
  { keys: 'Ctrl+Y', description: 'Redo', category: 'edit' },
  { keys: 'Ctrl+X', description: 'Cut', category: 'edit' },
  { keys: 'Ctrl+C', description: 'Copy', category: 'edit' },
  { keys: 'Ctrl+V', description: 'Paste', category: 'edit' },
  { keys: 'Ctrl+A', description: 'Select all', category: 'edit' },
  // Format
  { keys: 'Ctrl+B', description: 'Bold', category: 'format' },
  { keys: 'Ctrl+I', description: 'Italic', category: 'format' },
  { keys: 'Ctrl+U', description: 'Underline', category: 'format' },
  // View
  { keys: 'Ctrl+W', description: 'Toggle word wrap', category: 'view' },
  // Search
  { keys: 'Ctrl+F', description: 'Find & Replace', category: 'search' },
  { keys: 'F3', description: 'Find next', category: 'search' },
  { keys: 'Shift+F3', description: 'Find previous', category: 'search' },
];
