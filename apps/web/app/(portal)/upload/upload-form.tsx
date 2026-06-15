"use client";

import Link from "next/link";
import { useState, useRef, useCallback, type FormEvent, type ChangeEvent, type DragEvent } from "react";
import type { PrototypeWithAccessCode } from "@protypic/shared";

const EXPIRATIONS: Array<{ value: 1 | 7 | 30 | 90 | null; label: string }> = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: null, label: "Never" },
];

type Picked = { path: string; file: File };

async function fileToBase64(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(binary);
}

// File-picker FileList → strip the top-level folder name if the OS provided
// a webkitRelativePath (matches what the GCS layer expects).
function pathFromInputFile(f: File): string {
  const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (rel) {
    const parts = rel.split("/");
    return parts.slice(1).join("/") || f.name;
  }
  return f.name;
}

// Recursive walk of a dropped DataTransfer entry. Strips the top-level dir.
async function walkEntry(
  entry: FileSystemEntry,
  parent: string,
  out: Picked[],
  topLevel: boolean,
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    out.push({ path: parent + file.name, file });
    return;
  }
  if (entry.isDirectory) {
    const dir = entry as FileSystemDirectoryEntry;
    const reader = dir.createReader();
    const all: FileSystemEntry[] = [];
    // readEntries returns at most 100 per call.
    while (true) {
      const batch: FileSystemEntry[] = await new Promise((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      all.push(...batch);
    }
    const nextParent = topLevel ? "" : parent + entry.name + "/";
    await Promise.all(all.map((c) => walkEntry(c, nextParent, out, false)));
  }
}

async function pickedFromDataTransfer(dt: DataTransfer): Promise<Picked[]> {
  const items = dt.items;
  if (!items || items.length === 0) {
    return Array.from(dt.files).map((file) => ({ path: file.name, file }));
  }
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    const entry = it.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  if (entries.length === 0) {
    return Array.from(dt.files).map((file) => ({ path: file.name, file }));
  }
  const out: Picked[] = [];
  await Promise.all(entries.map((e) => walkEntry(e, "", out, true)));
  return out;
}

export function UploadForm() {
  const [name, setName] = useState("");
  const [expirationDays, setExpirationDays] = useState<1 | 7 | 30 | 90 | null>(7);
  const [isProtected, setIsProtected] = useState(true);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrototypeWithAccessCode | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const filePayload = await Promise.all(
        picked.map(async (p) => ({ path: p.path, contentBase64: await fileToBase64(p.file) })),
      );
      const res = await fetch("/api/prototypes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, expirationDays, isProtected, files: filePayload }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Upload failed (${res.status})`);
      }
      setResult((await res.json()) as PrototypeWithAccessCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return <ResultPanel result={result} onReset={() => { setResult(null); setName(""); setPicked([]); }} />;
  }

  const canSubmit = !!name && picked.length > 0 && !busy;

  return (
    <form onSubmit={submit} style={formStyle}>
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. dashboard concept v2"
          className="input"
        />
      </Field>

      <Field label="Expires">
        <SegmentedControl
          options={EXPIRATIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          value={String(expirationDays)}
          onChange={(v) => setExpirationDays(v === "null" ? null : (Number(v) as 1 | 7 | 30 | 90))}
        />
      </Field>

      <Field label="Access">
        <SegmentedControl
          options={[
            { value: "private", label: "Protected" },
            { value: "public", label: "Public" },
          ]}
          value={isProtected ? "private" : "public"}
          onChange={(v) => setIsProtected(v === "private")}
        />
        <p style={hintText}>
          {isProtected
            ? "Viewers must enter a generated access code."
            : "Anyone with the link can view."}
        </p>
      </Field>

      <Field label="Files">
        <DropZone picked={picked} onChange={setPicked} />
      </Field>

      {error && <p style={errStyle}>{error}</p>}

      <div style={submitRow}>
        <Link href="/dashboard" className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" disabled={!canSubmit} className="btn btn-primary">
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

function DropZone({
  picked,
  onChange,
}: {
  picked: Picked[];
  onChange: (next: Picked[]) => void;
}) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setOver(true);
  }, []);
  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setOver(false);
  }, []);
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);
  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setOver(false);
      setBusy(true);
      try {
        const out = await pickedFromDataTransfer(e.dataTransfer);
        onChange(out);
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );
  const onPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const list = Array.from(e.target.files ?? []);
      onChange(list.map((file) => ({ path: pathFromInputFile(file), file })));
    },
    [onChange],
  );

  if (picked.length > 0) {
    return <Summary picked={picked} onClear={() => onChange([])} onReplace={() => inputRef.current?.click()} inputRef={inputRef} onPick={onPick} />;
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        ...dropZoneStyle,
        ...(over ? activeDropStyle : {}),
      }}
    >
      <div style={dropIconStyle}>
        <UploadIcon />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <span style={dropTitle}>
          {busy ? "Reading files…" : "Drop your HTML file or folder"}
        </span>
        <span style={dropHint}>or click to browse</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.css,.js,.json,.svg,.png,.jpg,.jpeg,.gif,.webp,.ico,.woff,.woff2,.ttf,.eot,.txt,.xml"
        multiple
        onChange={onPick}
        style={{ display: "none" }}
      />
    </button>
  );
}

function Summary({
  picked,
  onClear,
  onReplace,
  inputRef,
  onPick,
}: {
  picked: Picked[];
  onClear: () => void;
  onReplace: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const totalKb = (picked.reduce((s, p) => s + p.file.size, 0) / 1024).toFixed(0);
  const top = topLevel(picked);
  return (
    <div style={summaryStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <FileIcon />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {top}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {picked.length} {picked.length === 1 ? "file" : "files"}{" "}
            <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>· {totalKb} KB</span>
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button type="button" onClick={onReplace} className="btn btn-ghost">Replace</button>
        <button type="button" onClick={onClear} className="btn btn-ghost">Clear</button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.css,.js,.json,.svg,.png,.jpg,.jpeg,.gif,.webp,.ico,.woff,.woff2,.ttf,.eot,.txt,.xml"
        multiple
        onChange={onPick}
        style={{ display: "none" }}
      />
    </div>
  );
}

function topLevel(picked: Picked[]): string {
  if (picked.length === 1 && !picked[0]!.path.includes("/")) {
    return picked[0]!.path;
  }
  const dirs = new Set<string>();
  for (const p of picked) {
    const slash = p.path.indexOf("/");
    if (slash > 0) dirs.add(p.path.slice(0, slash));
  }
  if (dirs.size === 1) return Array.from(dirs)[0]! + "/";
  return `${picked.length} file${picked.length === 1 ? "" : "s"}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={segmentStyle}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              ...segmentBtn,
              color: active ? "var(--text)" : "var(--text-muted)",
              background: active ? "var(--surface-hover)" : "transparent",
              boxShadow: active ? "inset 0 0 0 1px var(--border-hover)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: PrototypeWithAccessCode;
  onReset: () => void;
}) {
  return (
    <div style={formStyle}>
      <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>Uploaded</h2>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
        Save the access code now — it&apos;s shown only once.
      </p>
      <Row label="Link" value={result.url} mono />
      {result.accessCode && <Row label="Access code" value={result.accessCode} mono primary />}
      <Row
        label="Expires"
        value={result.expiresAt ? new Date(result.expiresAt).toLocaleString() : "Never"}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button onClick={onReset} className="btn btn-default">Upload another</button>
        <a href="/dashboard" className="btn btn-ghost">To prototypes →</a>
      </div>
    </div>
  );
}

function Row({ label, value, mono, primary }: { label: string; value: string; mono?: boolean; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={fieldLabel}>{label}</span>
      <div
        style={{
          ...resultRow,
          ...(primary ? { borderColor: "#3a3a3a", background: "#1c1c1c" } : {}),
        }}
      >
        <code
          style={{
            fontFamily: mono ? "var(--font-mono)" : "inherit",
            fontSize: primary ? 14 : 12.5,
            color: "var(--text)",
            flex: 1,
            overflow: "auto",
            background: "transparent",
          }}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="btn btn-ghost"
          style={{ minWidth: 60 }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }} aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 24,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--text-muted)",
  fontWeight: 500,
};
const segmentStyle: React.CSSProperties = {
  display: "inline-flex",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  padding: 3,
  gap: 2,
  alignSelf: "flex-start",
};
const segmentBtn: React.CSSProperties = {
  border: 0,
  borderRadius: 5,
  padding: "5px 12px",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 120ms, color 120ms",
  height: 28,
};
const hintText: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: 12.5,
};
const errStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--danger)",
  fontSize: 12.5,
};
const submitRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 6,
};
const resultRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "0 4px 0 12px",
  height: 38,
};
const dropZoneStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  width: "100%",
  padding: "32px 24px",
  background: "var(--bg)",
  border: "1.5px dashed var(--border-hover)",
  borderRadius: 10,
  color: "var(--text-muted)",
  cursor: "pointer",
  transition: "background 120ms, border-color 120ms, color 120ms",
};
const activeDropStyle: React.CSSProperties = {
  background: "var(--surface-hover)",
  borderColor: "#4a4a4a",
  color: "var(--text)",
};
const dropIconStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
const dropTitle: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 500,
  color: "var(--text)",
};
const dropHint: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--text-muted)",
};
const summaryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};
