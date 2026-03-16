"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DocFormat = "txt" | "rtf";
type Notice = { type: "success" | "error" | "info"; text: string } | null;

function rtfToPlainText(input: string): string {
  return input
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/g, (match) =>
      String.fromCharCode(parseInt(match.slice(2), 16)),
    )
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\r\n/g, "\n");
}

function escapeRtfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\n/g, "\\line ");
}

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br>");
}

function htmlToRtf(html: string): string {
  if (typeof window === "undefined") return `{\\rtf1\\ansi\n}`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeRtfText(node.textContent ?? "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const content = Array.from(el.childNodes).map(walk).join("");

    switch (tag) {
      case "b":
      case "strong":
        return `\\b ${content}\\b0 `;
      case "i":
      case "em":
        return `\\i ${content}\\i0 `;
      case "u":
        return `\\ul ${content}\\ul0 `;
      case "br":
        return "\\line ";
      case "p":
      case "div":
        return `${content}\\par `;
      default:
        return content;
    }
  };

  const rtfBody = walk(root ?? doc.body);
  return `{\\rtf1\\ansi\\deff0\n${rtfBody}\n}`;
}

function getAllMatches(haystack: string, needle: string, matchCase: boolean): number[] {
  if (!needle) return [];
  const source = matchCase ? haystack : haystack.toLowerCase();
  const query = matchCase ? needle : needle.toLowerCase();

  const indexes: number[] = [];
  let cursor = 0;
  while (cursor <= source.length) {
    const found = source.indexOf(query, cursor);
    if (found === -1) break;
    indexes.push(found);
    cursor = found + Math.max(needle.length, 1);
  }
  return indexes;
}

export default function MainExperience() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const richEditorRef = useRef<HTMLDivElement | null>(null);
  const openFallbackRef = useRef<HTMLInputElement | null>(null);

  const [docName, setDocName] = useState("Untitled");
  const [format, setFormat] = useState<DocFormat>("txt");
  const [wordWrap, setWordWrap] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const [textValue, setTextValue] = useState("");
  const [richHtml, setRichHtml] = useState("");

  const [activeHandle, setActiveHandle] = useState<any | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [matchCursor, setMatchCursor] = useState(-1);

  const [line, setLine] = useState(1);
  const [column, setColumn] = useState(1);

  const activeText = useMemo(() => {
    if (format === "txt") return textValue;
    return richEditorRef.current?.innerText?.replace(/\u00A0/g, " ") ?? "";
  }, [format, textValue, richHtml]);

  const words = useMemo(() => {
    const trimmed = activeText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [activeText]);

  const matches = useMemo(
    () => getAllMatches(activeText, findQuery, matchCase),
    [activeText, findQuery, matchCase],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const handleSelection = () => {
      if (format !== "rtf") return;
      const editor = richEditorRef.current;
      if (!editor) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.endContainer)) return;

      const preRange = range.cloneRange();
      preRange.selectNodeContents(editor);
      preRange.setEnd(range.endContainer, range.endOffset);
      const offset = preRange.toString().length;
      const before = (editor.innerText || "").slice(0, offset);
      const segments = before.split("\n");
      setLine(Math.max(segments.length, 1));
      setColumn((segments[segments.length - 1]?.length ?? 0) + 1);
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, [format]);

  const setNoticeSafe = (type: Notice extends null ? never : "success" | "error" | "info", text: string) => {
    setNotice({ type, text });
  };

  const focusEditor = () => {
    if (format === "txt") textareaRef.current?.focus();
    else richEditorRef.current?.focus();
  };

  const updateTxtCursor = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const segments = before.split("\n");
    setLine(segments.length);
    setColumn((segments[segments.length - 1]?.length ?? 0) + 1);
  };

  const applyPlainText = (nextText: string) => {
    if (format === "txt") {
      setTextValue(nextText);
    } else {
      const editor = richEditorRef.current;
      if (editor) {
        editor.innerHTML = plainTextToHtml(nextText);
        setRichHtml(editor.innerHTML);
      }
    }
    setIsDirty(true);
  };

  const confirmDiscardIfNeeded = (): boolean => {
    if (!isDirty) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  };

  const newDocument = (nextFormat: DocFormat = format) => {
    if (!confirmDiscardIfNeeded()) return;

    setDocName("Untitled");
    setFormat(nextFormat);
    setTextValue("");
    setRichHtml("");
    setActiveHandle(null);
    setIsDirty(false);
    setLine(1);
    setColumn(1);
    setMatchCursor(-1);

    if (nextFormat === "rtf") {
      requestAnimationFrame(() => {
        if (richEditorRef.current) richEditorRef.current.innerHTML = "";
      });
    }

    setNoticeSafe("info", `New ${nextFormat.toUpperCase()} document created`);
  };

  const runCommand = async (cmd: "cut" | "copy" | "paste" | "undo" | "redo" | "bold" | "italic" | "underline") => {
    focusEditor();

    try {
      if (cmd === "paste" && !document.queryCommandSupported("paste")) {
        const clip = await navigator.clipboard.readText();
        if (format === "txt") {
          const ta = textareaRef.current;
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const next = ta.value.slice(0, start) + clip + ta.value.slice(end);
          setTextValue(next);
          setIsDirty(true);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + clip.length;
            updateTxtCursor();
          });
        } else {
          document.execCommand("insertText", false, clip);
          setRichHtml(richEditorRef.current?.innerHTML ?? "");
          setIsDirty(true);
        }
        return;
      }

      const ok = document.execCommand(cmd);
      if (!ok) {
        setNoticeSafe("error", `Could not execute ${cmd}. Browser blocked the command.`);
        return;
      }

      if (cmd !== "copy") {
        if (format === "txt") setTextValue(textareaRef.current?.value ?? "");
        else setRichHtml(richEditorRef.current?.innerHTML ?? "");
        setIsDirty(true);
      }
    } catch (error) {
      setNoticeSafe("error", `Failed to run ${cmd}: ${(error as Error).message}`);
    }
  };

  const openUsingFallbackInput = () => openFallbackRef.current?.click();

  const handleOpen = async () => {
    if (!confirmDiscardIfNeeded()) return;

    try {
      const picker = (window as any).showOpenFilePicker;
      if (!picker) {
        openUsingFallbackInput();
        return;
      }

      const [handle] = await picker({
        multiple: false,
        types: [
          {
            description: "Text and Rich Text",
            accept: {
              "text/plain": [".txt"],
              "application/rtf": [".rtf"],
            },
          },
        ],
      });

      const file = await handle.getFile();
      const raw = await file.text();
      const ext = file.name.toLowerCase().endsWith(".rtf") ? "rtf" : "txt";
      const name = file.name.replace(/\.(txt|rtf)$/i, "") || "Untitled";

      setDocName(name);
      setFormat(ext);
      setActiveHandle(handle);
      setIsDirty(false);

      if (ext === "txt") {
        setTextValue(raw);
      } else {
        const plain = raw.trimStart().startsWith("{\\rtf") ? rtfToPlainText(raw) : raw;
        const html = plainTextToHtml(plain);
        setRichHtml(html);
        requestAnimationFrame(() => {
          if (richEditorRef.current) richEditorRef.current.innerHTML = html;
        });
      }

      setNoticeSafe("success", `${file.name} opened successfully`);
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setNoticeSafe("error", `Could not open file: ${error?.message ?? "Unknown error"}`);
    }
  };

  const saveBlobAsDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getPayloadForSave = () => {
    if (format === "txt") {
      return {
        content: textValue,
        mime: "text/plain;charset=utf-8",
        ext: "txt" as const,
      };
    }

    const html = richEditorRef.current?.innerHTML ?? richHtml;
    return {
      content: htmlToRtf(html),
      mime: "application/rtf;charset=utf-8",
      ext: "rtf" as const,
    };
  };

  const writeToHandle = async (handle: any, content: string) => {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const handleSaveAs = async () => {
    const { content, mime, ext } = getPayloadForSave();
    const suggested = `${docName || "Untitled"}.${ext}`;

    try {
      const picker = (window as any).showSaveFilePicker;
      if (!picker) {
        saveBlobAsDownload(suggested, content, mime);
        setIsDirty(false);
        setNoticeSafe("success", "File downloaded (Save As fallback)");
        return;
      }

      const handle = await picker({
        suggestedName: suggested,
        types: [
          {
            description: ext === "txt" ? "Text file" : "Rich Text file",
            accept:
              ext === "txt"
                ? { "text/plain": [".txt"] }
                : { "application/rtf": [".rtf"] },
          },
        ],
      });

      await writeToHandle(handle, content);
      setActiveHandle(handle);
      setIsDirty(false);
      setNoticeSafe("success", `${suggested} saved`);
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setNoticeSafe("error", `Save As failed: ${error?.message ?? "Unknown error"}`);
    }
  };

  const handleSave = async () => {
    const { content, mime, ext } = getPayloadForSave();

    try {
      if (activeHandle) {
        await writeToHandle(activeHandle, content);
        setIsDirty(false);
        setNoticeSafe("success", "Document saved");
        return;
      }

      const defaultFile = `${docName || "Untitled"}.${ext}`;
      saveBlobAsDownload(defaultFile, content, mime);
      setIsDirty(false);
      setNoticeSafe("info", "No file handle yet. Downloaded file instead.");
    } catch (error: any) {
      setNoticeSafe("error", `Save failed: ${error?.message ?? "Unknown error"}`);
    }
  };

  const selectRangeByOffsets = (start: number, end: number) => {
    if (format === "txt") {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(start, end);
      updateTxtCursor();
      return;
    }

    const editor = richEditorRef.current;
    if (!editor) return;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    let counted = 0;

    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startOffset = 0;
    let endOffset = 0;

    while (node) {
      const length = node.textContent?.length ?? 0;
      const nodeStart = counted;
      const nodeEnd = counted + length;

      if (!startNode && start >= nodeStart && start <= nodeEnd) {
        startNode = node;
        startOffset = start - nodeStart;
      }

      if (!endNode && end >= nodeStart && end <= nodeEnd) {
        endNode = node;
        endOffset = end - nodeStart;
      }

      counted = nodeEnd;
      node = walker.nextNode();
    }

    if (!startNode || !endNode) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
  };

  const findNext = () => {
    if (!findQuery) {
      setNoticeSafe("info", "Enter text to find first.");
      return;
    }

    if (matches.length === 0) {
      setMatchCursor(-1);
      setNoticeSafe("info", `No matches for "${findQuery}"`);
      return;
    }

    const next = (matchCursor + 1) % matches.length;
    setMatchCursor(next);
    const start = matches[next];
    selectRangeByOffsets(start, start + findQuery.length);
  };

  const replaceCurrent = () => {
    if (!findQuery) return;
    if (matches.length === 0) return;

    const targetIndex = matchCursor >= 0 ? matches[matchCursor] : matches[0];
    const nextText =
      activeText.slice(0, targetIndex) + replaceQuery + activeText.slice(targetIndex + findQuery.length);

    applyPlainText(nextText);
    setNoticeSafe("success", "Replaced current match");
    setMatchCursor(-1);
  };

  const replaceAll = () => {
    if (!findQuery) return;
    if (matches.length === 0) {
      setNoticeSafe("info", "No matches to replace.");
      return;
    }

    const src = matchCase ? activeText : activeText.toLowerCase();
    const query = matchCase ? findQuery : findQuery.toLowerCase();

    let index = 0;
    let output = "";
    let replaced = 0;

    while (index < activeText.length) {
      const found = src.indexOf(query, index);
      if (found === -1) {
        output += activeText.slice(index);
        break;
      }
      output += activeText.slice(index, found) + replaceQuery;
      index = found + findQuery.length;
      replaced += 1;
    }

    applyPlainText(output);
    setMatchCursor(-1);
    setNoticeSafe("success", `Replaced ${replaced} match${replaced === 1 ? "" : "es"}`);
  };

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const cmd = event.ctrlKey || event.metaKey;
      if (!cmd) return;

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        handleSave();
      }
      if (key === "f") {
        event.preventDefault();
        setShowFind(true);
      }
      if (format === "rtf" && ["b", "i", "u"].includes(key)) {
        event.preventDefault();
        if (key === "b") runCommand("bold");
        if (key === "i") runCommand("italic");
        if (key === "u") runCommand("underline");
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [format, richHtml, textValue, activeHandle]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 md:px-8">
      <input
        ref={openFallbackRef}
        type="file"
        accept=".txt,.rtf,text/plain,application/rtf"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          try {
            const content = await file.text();
            const ext: DocFormat = file.name.toLowerCase().endsWith(".rtf") ? "rtf" : "txt";
            const name = file.name.replace(/\.(txt|rtf)$/i, "") || "Untitled";

            setDocName(name);
            setFormat(ext);
            setActiveHandle(null);
            setIsDirty(false);

            if (ext === "txt") {
              setTextValue(content);
            } else {
              const plain = content.trimStart().startsWith("{\\rtf") ? rtfToPlainText(content) : content;
              const html = plainTextToHtml(plain);
              setRichHtml(html);
              requestAnimationFrame(() => {
                if (richEditorRef.current) richEditorRef.current.innerHTML = html;
              });
            }

            setNoticeSafe("success", `${file.name} opened`);
          } catch (error: any) {
            setNoticeSafe("error", `Could not read file: ${error?.message ?? "Unknown error"}`);
          } finally {
            e.currentTarget.value = "";
          }
        }}
      />

      <header className="mb-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Notepad Pro</h1>
            <p className="text-sm text-slate-400">Create, open, edit, and save TXT/RTF files with desktop-like workflows.</p>
          </div>
          <div className="text-xs text-slate-400">
            <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1">{isDirty ? "Unsaved changes" : "All changes saved"}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">File</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => newDocument("txt")} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">New TXT</button>
              <button onClick={() => newDocument("rtf")} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">New RTF</button>
              <button onClick={handleOpen} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600">Open</button>
              <button onClick={handleSave} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">Save</button>
              <button onClick={handleSaveAs} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600">Save As</button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Edit & View</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => runCommand("undo")} className="rounded-md bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Undo</button>
              <button onClick={() => runCommand("redo")} className="rounded-md bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Redo</button>
              <button onClick={() => runCommand("cut")} className="rounded-md bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Cut</button>
              <button onClick={() => runCommand("copy")} className="rounded-md bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Copy</button>
              <button onClick={() => runCommand("paste")} className="rounded-md bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Paste</button>
              <button
                onClick={() => setWordWrap((v) => !v)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${wordWrap ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                Word Wrap: {wordWrap ? "On" : "Off"}
              </button>
              <button
                onClick={() => setShowFind((v) => !v)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${showFind ? "bg-amber-600 text-white hover:bg-amber-500" : "bg-slate-700 hover:bg-slate-600"}`}
              >
                Find / Replace
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={format !== "rtf"}
            onClick={() => runCommand("bold")}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Bold
          </button>
          <button
            disabled={format !== "rtf"}
            onClick={() => runCommand("italic")}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Italic
          </button>
          <button
            disabled={format !== "rtf"}
            onClick={() => runCommand("underline")}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Underline
          </button>
          {format !== "rtf" && <p className="self-center text-xs text-slate-400">Formatting tools are available in RTF mode.</p>}
        </div>
      </header>

      {showFind && (
        <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-300">Find</span>
              <input
                value={findQuery}
                onChange={(e) => {
                  setFindQuery(e.target.value);
                  setMatchCursor(-1);
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-sky-500 transition focus:ring-2"
                placeholder="Search term"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-slate-300">Replace</span>
              <input
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-sky-500 transition focus:ring-2"
                placeholder="Replacement text"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={findNext} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500">Find Next</button>
            <button onClick={replaceCurrent} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">Replace</button>
            <button onClick={replaceAll} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">Replace All</button>
            <label className="ml-1 inline-flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
              Match case
            </label>
            <span className="ml-auto text-xs text-slate-400">{findQuery ? `${matches.length} match(es)` : "Enter a search term"}</span>
          </div>
        </section>
      )}

      {notice && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            notice.type === "error"
              ? "border-rose-700 bg-rose-950/40 text-rose-200"
              : notice.type === "success"
                ? "border-emerald-700 bg-emerald-950/40 text-emerald-200"
                : "border-sky-700 bg-sky-950/40 text-sky-200"
          }`}
        >
          {notice.text}
        </div>
      )}

      <section className="flex min-h-[55vh] flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/25">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-sm text-slate-300">
          <div>
            <span className="font-medium text-white">{docName}</span>
            <span className="ml-2 text-slate-500">.{format}</span>
            {isDirty && <span className="ml-2 text-amber-400">● modified</span>}
          </div>
          <div className="text-xs text-slate-400">Shortcuts: Ctrl/Cmd+S, Ctrl/Cmd+F, Ctrl/Cmd+B/I/U (RTF)</div>
        </div>

        {format === "txt" ? (
          <textarea
            ref={textareaRef}
            value={textValue}
            onChange={(e) => {
              setTextValue(e.target.value);
              setIsDirty(true);
            }}
            onClick={updateTxtCursor}
            onKeyUp={updateTxtCursor}
            onSelect={updateTxtCursor}
            spellCheck={false}
            wrap={wordWrap ? "soft" : "off"}
            className={`h-full w-full flex-1 resize-none border-0 bg-slate-950/70 p-4 font-mono text-sm leading-6 text-slate-100 outline-none ${wordWrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}
            placeholder="Start writing your note..."
          />
        ) : (
          <div
            ref={richEditorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              setRichHtml((e.currentTarget as HTMLDivElement).innerHTML);
              setIsDirty(true);
            }}
            className={`h-full w-full flex-1 overflow-auto bg-slate-950/70 p-4 font-mono text-sm leading-6 text-slate-100 outline-none ${wordWrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}
            style={{ minHeight: "40vh" }}
          />
        )}
      </section>

      <footer className="mt-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 md:grid-cols-5">
        <div>
          Line <span className="font-semibold text-white">{line}</span>, Col <span className="font-semibold text-white">{column}</span>
        </div>
        <div>
          Words <span className="font-semibold text-white">{words}</span>
        </div>
        <div>
          Characters <span className="font-semibold text-white">{activeText.length}</span>
        </div>
        <div>
          Format <span className="font-semibold uppercase text-white">{format}</span>
        </div>
        <div className="md:text-right">Word Wrap: <span className="font-semibold text-white">{wordWrap ? "Enabled" : "Disabled"}</span></div>
      </footer>
    </div>
  );
}
