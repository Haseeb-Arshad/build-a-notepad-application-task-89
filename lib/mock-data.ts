export type SupportedFileFormat = 'txt' | 'rtf';

export interface NotepadDocument {
  id: string;
  name: string;
  content: string;
  format: SupportedFileFormat;
  lastModified: number;
  dirty: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
  selectionLength: number;
}

export interface FindMatch {
  start: number;
  end: number;
  line: number;
  column: number;
}

const RTF_HEADER = '{\\rtf1\\ansi\\deff0\n';
const RTF_FOOTER = '\n}';
const FILE_NAME_SANITIZE_REGEX = /[<>:"/\\|?*\u0000-\u001F]/g;

export const DEFAULT_FILE_NAME = 'untitled.txt';

export const DEFAULT_DOCUMENT_CONTENT = `Welcome to Notepad Pro\n\n• Create, open, and save local files\n• Use Find & Replace for quick edits\n• Toggle word wrap for readability\n\nStart typing to begin...`;

export const FILE_FORMATS: ReadonlyArray<{
  value: SupportedFileFormat;
  label: string;
  mime: string;
}> = [
  { value: 'txt', label: 'Plain Text (.txt)', mime: 'text/plain;charset=utf-8' },
  { value: 'rtf', label: 'Rich Text Format (.rtf)', mime: 'application/rtf;charset=utf-8' },
];

function timestamp(): number {
  return Date.now();
}

function randomIdChunk(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function generateDocumentId(): string {
  return `doc_${timestamp().toString(36)}_${randomIdChunk()}`;
}

export function inferFormatFromFilename(fileName: string): SupportedFileFormat {
  const lowered = fileName.trim().toLowerCase();
  if (lowered.endsWith('.rtf')) {
    return 'rtf';
  }
  return 'txt';
}

export function sanitizeFileName(rawName: string, fallback = DEFAULT_FILE_NAME): string {
  const cleaned = rawName.replace(FILE_NAME_SANITIZE_REGEX, '').trim();
  if (!cleaned) {
    return fallback;
  }
  return cleaned;
}

export function ensureExtension(name: string, format: SupportedFileFormat): string {
  const safe = sanitizeFileName(name);
  const expectedExtension = `.${format}`;
  if (safe.toLowerCase().endsWith(expectedExtension)) {
    return safe;
  }

  // Remove existing extension before appending a supported one.
  const base = safe.replace(/\.[a-zA-Z0-9]+$/, '');
  return `${base}${expectedExtension}`;
}

export function createNewDocument(
  overrides?: Partial<Pick<NotepadDocument, 'name' | 'content' | 'format'>>,
): NotepadDocument {
  const format = overrides?.format ?? inferFormatFromFilename(overrides?.name ?? DEFAULT_FILE_NAME);
  const name = ensureExtension(overrides?.name ?? DEFAULT_FILE_NAME, format);

  return {
    id: generateDocumentId(),
    name,
    content: overrides?.content ?? '',
    format,
    lastModified: timestamp(),
    dirty: false,
  };
}

export function markDocumentDirty(doc: NotepadDocument, dirty = true): NotepadDocument {
  return {
    ...doc,
    dirty,
    lastModified: timestamp(),
  };
}

export function toDownloadPayload(content: string, format: SupportedFileFormat): string {
  if (format === 'txt') {
    return content;
  }

  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par\n');

  return `${RTF_HEADER}${escaped}${RTF_FOOTER}`;
}

export function fromFilePayload(payload: string, format: SupportedFileFormat): string {
  if (format === 'txt') {
    return payload;
  }

  // Minimal, defensive RTF text extraction for lightweight notepad support.
  // We do not try to preserve advanced styles; we extract readable plain text.
  const withoutHeader = payload
    .replace(/^\{\\rtf1[\s\S]*?\n/, '')
    .replace(/\n\}$/, '')
    .replace(/\\par[d]?\s?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, '\\')
    .trim();

  return withoutHeader;
}

export function getMimeType(format: SupportedFileFormat): string {
  const item = FILE_FORMATS.find((entry) => entry.value === format);
  return item?.mime ?? 'text/plain;charset=utf-8';
}

export async function readFileContent(file: File): Promise<{ content: string; format: SupportedFileFormat }> {
  const format = inferFormatFromFilename(file.name);

  try {
    const text = await file.text();
    return {
      content: fromFilePayload(text, format),
      format,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown read failure';
    throw new Error(`Unable to read file \"${file.name}\": ${reason}`);
  }
}

export function downloadToLocalFile(args: {
  fileName: string;
  content: string;
  format: SupportedFileFormat;
}): void {
  if (typeof window === 'undefined') {
    throw new Error('Local file download is only available in the browser environment.');
  }

  const resolvedName = ensureExtension(args.fileName, args.format);
  const payload = toDownloadPayload(args.content, args.format);
  const blob = new Blob([payload], { type: getMimeType(args.format) });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = resolvedName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function getAcceptedFileTypes(): string {
  return '.txt,.rtf,text/plain,application/rtf';
}

export function calculateCursorPosition(text: string, caretIndex: number, selectionLength = 0): CursorPosition {
  const safeIndex = Math.max(0, Math.min(caretIndex, text.length));
  const lines = text.slice(0, safeIndex).split('\n');

  return {
    line: Math.max(1, lines.length),
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
    selectionLength: Math.max(0, selectionLength),
  };
}

export function findMatches(
  content: string,
  query: string,
  options?: { caseSensitive?: boolean },
): FindMatch[] {
  if (!query) {
    return [];
  }

  const source = options?.caseSensitive ? content : content.toLowerCase();
  const needle = options?.caseSensitive ? query : query.toLowerCase();
  const matches: FindMatch[] = [];

  let index = 0;
  while (index < source.length) {
    const at = source.indexOf(needle, index);
    if (at < 0) {
      break;
    }

    const position = calculateCursorPosition(content, at);
    matches.push({
      start: at,
      end: at + query.length,
      line: position.line,
      column: position.column,
    });

    // Step forward by at least one char to avoid infinite loops.
    index = at + Math.max(needle.length, 1);
  }

  return matches;
}

export function replaceAllMatches(
  content: string,
  query: string,
  replacement: string,
  options?: { caseSensitive?: boolean },
): { content: string; count: number } {
  if (!query) {
    return { content, count: 0 };
  }

  const matches = findMatches(content, query, options);
  if (matches.length === 0) {
    return { content, count: 0 };
  }

  let output = '';
  let cursor = 0;

  for (const match of matches) {
    output += content.slice(cursor, match.start);
    output += replacement;
    cursor = match.end;
  }

  output += content.slice(cursor);

  return {
    content: output,
    count: matches.length,
  };
}

export const sampleFileEntries: ReadonlyArray<NotepadDocument> = [
  {
    id: 'sample_1',
    name: 'meeting-notes.txt',
    format: 'txt',
    content: 'Meeting Notes\n\n- Confirm milestone dates\n- Review QA sign-off checklist\n- Schedule deployment window',
    lastModified: timestamp(),
    dirty: false,
  },
  {
    id: 'sample_2',
    name: 'quick-draft.rtf',
    format: 'rtf',
    content: 'Draft Heading\n\nThis is a lightweight RTF-compatible draft loaded as plain text in the editor.',
    lastModified: timestamp(),
    dirty: false,
  },
];
