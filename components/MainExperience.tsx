"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type FileFormat = "txt" | "rtf";
type NoticeType = "success" | "error" | "info";

type Notice = {
  type: NoticeType;
  message: string;
} | null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWords(value: string): number {
  const tokens = value.trim().match(/\S+/g);
  return tokens ? tokens.length : 0;
}

function getLineAndColumn(content: string, cursorIndex: number): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(cursorIndex, content.length));
  const upToCursor = content.slice(0, safeIndex);
  const lines = upToCursor.split("\n");
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
}

function parseRtfToText(rtf: string): string {
  // Lightweight RTF to text conversion for common files. It is not a full parser,
  // but handles most practical cases (control words, escaped hex, paragraph tags).
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainTextToRtf(text: string): string {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\par\n");
  return `{\\rtf1\\ansi\n${escaped}\n}`;
}

async function writeFileToDisk(
  handle: any,
  data: string,
  format: FileFormat,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(format === "rtf" ? plainTextToRtf(data) : data);
  await writable.close();
}

function downloadBlob(content: string, format: FileFormat, fileName: string): void {
  const mime = format === "rtf" ? "application/rtf;charset=utf-8" : "text/plain;charset=utf-8";
  const finalContent = format === "rtf" ? plainTextToRtf(content) : content;
  const blob = new Blob([finalContent], { type: mime });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function MainExperience() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState<string>("");
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [fileName, setFileName] = useState<string>("Untitled.txt");
  const [format, setFormat] = useState<FileFormat>("txt");
  const [fileHandle, setFileHandle] = useState<any | null>(null);

  const [historyPast, setHistoryPast] = useState<string[]>([]);
  const [historyFuture, setHistoryFuture] = useState<string[]>([]);

  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);
  const [wordWrap, setWordWrap] = useState<boolean>(true);

  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [findValue, setFindValue] = useState<string>("");
  const [replaceValue, setReplaceValue] = useState<string>("");
  const [matchCase, setMatchCase] = useState<boolean>(false);

  const [notice, setNotice] = useState<Notice>(null);

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;
  const isDirty = content !== savedSnapshot;

  const { line, column } = useMemo(
    () => getLineAndColumn(content, selectionStart),
    [content, selectionStart],
  );

  const wordCount = useMemo(() => countWords(content), [content]);

  const setTransientNotice = (next: Notice) => {
    setNotice(next);
    if (next) {
      window.setTimeout(() => setNotice(null), 3200);
    }
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const pushHistoryAndUpdate = (nextValue: string) => {
    if (nextValue === content) return;
    setHistoryPast((prev) => [...prev.slice(-200), content]);
    setHistoryFuture([]);
    setContent(nextValue);
  };

  const confirmDiscardIfDirty = (): boolean => {
    if (!isDirty) return true;
    return window.confirm("You have unsaved changes. Continue and discard them?");
  };

  const handleNew = () => {
    if (!confirmDiscardIfDirty()) return;

    setContent("");
    setSavedSnapshot("");
    setFileName("Untitled.txt");
    setFormat("txt");
    setFileHandle(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectionStart(0);
    setSelectionEnd(0);
    setTransientNotice({ type: "info", message: "Started a new document." });
    focusEditor();
  };

  const handleOpenFallback = () => {
    fileInputRef.current?.click();
  };

  const openWithPicker = async () => {
    if (!confirmDiscardIfDirty()) return;

    try {
      const picker = (window as any).showOpenFilePicker;
      if (!picker) {
        handleOpenFallback();
        return;
      }

      const [handle] = await picker({
        multiple: false,
        excludeAcceptAllOption: false,
        types: [
          {
            description: "Text and RTF",
            accept: {
              "text/plain": [".txt"],
              "application/rtf": [".rtf"],
            },
          },
        ],
      });

      const file = await handle.getFile();
      const text = await file.text();
      const incomingFormat: FileFormat = file.name.toLowerCase().endsWith(".rtf") ? "rtf" : "txt";
      const parsed = incomingFormat === "rtf" ? parseRtfToText(text) : text;

      setContent(parsed);
      setSavedSnapshot(parsed);
      setFileName(file.name);
      setFormat(incomingFormat);
      setFileHandle(handle);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectionStart(0);
      setSelectionEnd(0);
      setTransientNotice({ type: "success", message: `Opened ${file.name}` });
      focusEditor();
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "AbortError") return;
      setTransientNotice({ type: "error", message: "Unable to open file. Please try again." });
    }
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!confirmDiscardIfDirty()) return;

    try {
      const text = await file.text();
      const incomingFormat: FileFormat = file.name.toLowerCase().endsWith(".rtf") ? "rtf" : "txt";
      const parsed = incomingFormat === "rtf" ? parseRtfToText(text) : text;

      setContent(parsed);
      setSavedSnapshot(parsed);
      setFileName(file.name);
      setFormat(incomingFormat);
      setFileHandle(null);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectionStart(0);
      setSelectionEnd(0);
      setTransientNotice({ type: "success", message: `Opened ${file.name}` });
      focusEditor();
    } catch {
      setTransientNotice({ type: "error", message: "Failed to read this file." });
    }
  };

  const saveAs = async () => {
    try {
      const base = fileName.replace(/\.(txt|rtf)$/i, "");
      const suggestedName = `${base || "Untitled"}.${format}`;
      const savePicker = (window as any).showSaveFilePicker;

      if (savePicker) {
        const handle = await savePicker({
          suggestedName,
          types: [
            {
              description: format === "rtf" ? "Rich Text" : "Text Document",
              accept:
                format === "rtf"
                  ? { "application/rtf": [".rtf"] }
                  : { "text/plain": [".txt"] },
            },
          ],
        });

        await writeFileToDisk(handle, content, format);
        const nextName = handle.name ?? suggestedName;
        setFileHandle(handle);
        setFileName(nextName);
        setSavedSnapshot(content);
        setTransientNotice({ type: "success", message: `Saved ${nextName}` });
        return;
      }

      downloadBlob(content, format, suggestedName);
      setFileName(suggestedName);
      setSavedSnapshot(content);
      setTransientNotice({
        type: "info",
        message: "Downloaded file (browser mode). Use a desktop shell for full file-system persistence.",
      });
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "AbortError") return;
      setTransientNotice({ type: "error", message: "Save As failed. Check file permissions and try again." });
    }
  };

  const save = async () => {
    try {
      if (!fileHandle) {
        await saveAs();
        return;
      }

      await writeFileToDisk(fileHandle, content, format);
      setSavedSnapshot(content);
      setTransientNotice({ type: "success", message: `Saved ${fileName}` });
    } catch {
      setTransientNotice({
        type: "error",
        message: "Could not save to this location. Try Save As to choose a new destination.",
      });
    }
  };

  const updateSelectionFromEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setSelectionStart(editor.selectionStart ?? 0);
    setSelectionEnd(editor.selectionEnd ?? 0);
  };

  const applyEditorChange = (next: string) => {
    pushHistoryAndUpdate(next);
  };

  const handleEditorInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    applyEditorChange(event.target.value);
    setSelectionStart(event.target.selectionStart ?? 0);
    setSelectionEnd(event.target.selectionEnd ?? 0);
  };

  const undo = () => {
    if (!canUndo) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [content, ...prev].slice(0, 200));
    setContent(previous);
    setTransientNotice({ type: "info", message: "Undo" });
  };

  const redo = () => {
    if (!canRedo) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev.slice(-200), content]);
    setContent(next);
    setTransientNotice({ type: "info", message: "Redo" });
  };

  const cutSelection = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;

    const selected = content.slice(start, end);

    try {
      await navigator.clipboard.writeText(selected);
      const next = content.slice(0, start) + content.slice(end);
      pushHistoryAndUpdate(next);
      window.requestAnimationFrame(() => {
        editor.focus();
        editor.setSelectionRange(start, start);
        updateSelectionFromEditor();
      });
      setTransientNotice({ type: "success", message: "Cut to clipboard" });
    } catch {
      setTransientNotice({ type: "error", message: "Clipboard permission denied for cut." });
    }
  };

  const copySelection = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;

    try {
      await navigator.clipboard.writeText(content.slice(start, end));
      setTransientNotice({ type: "success", message: "Copied to clipboard" });
    } catch {
      setTransientNotice({ type: "error", message: "Clipboard permission denied for copy." });
    }
  };

  const pasteAtCursor = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const pasted = await navigator.clipboard.readText();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const next = content.slice(0, start) + pasted + content.slice(end);
      pushHistoryAndUpdate(next);

      const caret = start + pasted.length;
      window.requestAnimationFrame(() => {
        editor.focus();
        editor.setSelectionRange(caret, caret);
        updateSelectionFromEditor();
      });
      setTransientNotice({ type: "success", message: "Pasted from clipboard" });
    } catch {
      setTransientNotice({ type: "error", message: "Clipboard read failed. Browser may require permission." });
    }
  };

  const applyInlineWrapper = (prefix: string, suffix = prefix) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = content.slice(start, end) || "text";

    const wrapped = `${prefix}${selected}${suffix}`;
    const next = content.slice(0, start) + wrapped + content.slice(end);
    pushHistoryAndUpdate(next);

    const nextStart = start + prefix.length;
    const nextEnd = nextStart + selected.length;

    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(nextStart, nextEnd);
      updateSelectionFromEditor();
    });
  };

  const findNext = () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!findValue.trim()) {
      setTransientNotice({ type: "error", message: "Enter text in Find to search." });
      return;
    }

    const source = matchCase ? content : content.toLowerCase();
    const query = matchCase ? findValue : findValue.toLowerCase();

    const startFrom = Math.max(selectionEnd, 0);
    let index = source.indexOf(query, startFrom);
    if (index < 0 && startFrom > 0) {
      index = source.indexOf(query, 0);
    }

    if (index < 0) {
      setTransientNotice({ type: "info", message: `No matches for \"${findValue}\".` });
      return;
    }

    const to = index + findValue.length;
    editor.focus();
    editor.setSelectionRange(index, to);
    setSelectionStart(index);
    setSelectionEnd(to);
  };

  const replaceCurrent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!findValue.trim()) {
      setTransientNotice({ type: "error", message: "Enter text in Find to replace." });
      return;
    }

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = content.slice(start, end);
    const matchSelected = matchCase
      ? selected === findValue
      : selected.toLowerCase() === findValue.toLowerCase();

    if (!matchSelected) {
      findNext();
      return;
    }

    const next = content.slice(0, start) + replaceValue + content.slice(end);
    pushHistoryAndUpdate(next);

    const nextCaret = start + replaceValue.length;
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(nextCaret, nextCaret);
      setSelectionStart(nextCaret);
      setSelectionEnd(nextCaret);
    });
  };

  const replaceAll = () => {
    if (!findValue.trim()) {
      setTransientNotice({ type: "error", message: "Enter text in Find to replace all." });
      return;
    }

    const regex = new RegExp(escapeRegExp(findValue), matchCase ? "g" : "gi");
    const matches = content.match(regex);
    const count = matches?.length ?? 0;

    if (count === 0) {
      setTransientNotice({ type: "info", message: `No matches for \"${findValue}\".` });
      return;
    }

    const next = content.replace(regex, replaceValue);
    pushHistoryAndUpdate(next);
    setTransientNotice({ type: "success", message: `Replaced ${count} occurrence${count > 1 ? "s" : ""}.` });
  };

  const noticeClasses =
    notice?.type === "error"
      ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
      : notice?.type === "success"
        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
        : "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 md:p-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.rtf,text/plain,application/rtf"
        onChange={handleFileInput}
      />

      <header className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/20 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Notepad Pro Workspace</h1>
            <p className="text-sm text-slate-400">
              Create, open, edit, and save <span className="font-medium text-slate-200">.txt</span> and{" "}
              <span className="font-medium text-slate-200">.rtf</span> documents.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
            {fileName}
            {isDirty ? " • Unsaved" : " • Saved"}
          </div>
        </div>
      </header>

      <section className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleNew} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            New
          </button>
          <button onClick={openWithPicker} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            Open
          </button>
          <button onClick={save} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500">
            Save
          </button>
          <button onClick={saveAs} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            Save As
          </button>

          <span className="mx-1 h-6 w-px bg-slate-700" />

          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-700"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-700"
          >
            Redo
          </button>
          <button onClick={cutSelection} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            Cut
          </button>
          <button onClick={copySelection} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            Copy
          </button>
          <button onClick={pasteAtCursor} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            Paste
          </button>

          <span className="mx-1 h-6 w-px bg-slate-700" />

          <button
            onClick={() => applyInlineWrapper("**")}
            className="rounded-md bg-slate-800 px-2.5 py-1.5 text-sm font-semibold hover:bg-slate-700"
            title="Wrap selection with **bold**"
          >
            B
          </button>
          <button
            onClick={() => applyInlineWrapper("*")}
            className="rounded-md bg-slate-800 px-2.5 py-1.5 text-sm italic hover:bg-slate-700"
            title="Wrap selection with *italic*"
          >
            I
          </button>
          <button
            onClick={() => applyInlineWrapper("<u>", "</u>")}
            className="rounded-md bg-slate-800 px-2.5 py-1.5 text-sm underline hover:bg-slate-700"
            title="Wrap selection with <u>underline</u>"
          >
            U
          </button>

          <span className="mx-1 h-6 w-px bg-slate-700" />

          <label className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={(e) => setWordWrap(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Word Wrap
          </label>

          <button
            onClick={() => setShowFindReplace((prev) => !prev)}
            className="ml-auto rounded-md bg-cyan-700 px-3 py-1.5 text-sm hover:bg-cyan-600"
          >
            {showFindReplace ? "Hide Find/Replace" : "Find/Replace"}
          </button>
        </div>

        {showFindReplace && (
          <div className="mt-3 grid gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-center">
            <input
              value={findValue}
              onChange={(e) => setFindValue(e.target.value)}
              placeholder="Find"
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <input
              value={replaceValue}
              onChange={(e) => setReplaceValue(e.target.value)}
              placeholder="Replace with"
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            />
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
              />
              Match case
            </label>
            <button onClick={findNext} className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
              Find Next
            </button>
            <div className="flex gap-2">
              <button onClick={replaceCurrent} className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
                Replace
              </button>
              <button onClick={replaceAll} className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
                Replace All
              </button>
            </div>
          </div>
        )}
      </section>

      {notice && (
        <div className={`mb-3 rounded-xl border px-3 py-2 text-sm ${noticeClasses}`}>{notice.message}</div>
      )}

      <section className="flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleEditorInput}
          onClick={updateSelectionFromEditor}
          onKeyUp={updateSelectionFromEditor}
          onSelect={updateSelectionFromEditor}
          spellCheck={false}
          wrap={wordWrap ? "soft" : "off"}
          className="h-[60vh] w-full resize-none border-0 bg-slate-950/80 p-4 font-mono text-sm leading-6 text-slate-100 outline-none md:text-[15px]"
          style={{ whiteSpace: wordWrap ? "pre-wrap" : "pre" }}
          placeholder="Start typing your notes..."
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Ln {line}, Col {column}
            </span>
            <span>{content.length} chars</span>
            <span>{wordCount} words</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span>Format: {format.toUpperCase()}</span>
            <span>{wordWrap ? "Wrap: On" : "Wrap: Off"}</span>
            <span>{isDirty ? "Edited" : "No changes"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
