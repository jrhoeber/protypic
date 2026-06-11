"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import type { PrototypeWithAccessCode } from "@protypic/shared";

const EXPIRATIONS: Array<{ value: 1 | 7 | 30 | 90 | null; label: string }> = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: null, label: "Never" },
];

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

function relativePath(f: File): string {
  // Folder picker exposes webkitRelativePath; single file picker leaves it empty.
  const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (rel) {
    const parts = rel.split("/");
    return parts.slice(1).join("/") || f.name;
  }
  return f.name;
}

export function UploadForm() {
  const [name, setName] = useState("");
  const [expirationDays, setExpirationDays] = useState<1 | 7 | 30 | 90 | null>(7);
  const [isProtected, setIsProtected] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrototypeWithAccessCode | null>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    setFiles(list);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const filePayload = await Promise.all(
        files.map(async (f) => ({ path: relativePath(f), contentBase64: await fileToBase64(f) })),
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
    return <ResultPanel result={result} onReset={() => { setResult(null); setName(""); setFiles([]); }} />;
  }

  return (
    <form onSubmit={submit} style={formStyle}>
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. dashboard concept v2"
          style={inputStyle}
        />
      </Field>

      <Field label="Expiration">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXPIRATIONS.map((o) => (
            <button
              type="button"
              key={String(o.value)}
              onClick={() => setExpirationDays(o.value)}
              style={pillStyle(expirationDays === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Access">
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setIsProtected(true)} style={pillStyle(isProtected)}>
            Access-code protected
          </button>
          <button type="button" onClick={() => setIsProtected(false)} style={pillStyle(!isProtected)}>
            Public
          </button>
        </div>
      </Field>

      <Field label="Files">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => fileRef.current?.click()} style={btnStyle}>
              Single HTML file
            </button>
            <button type="button" onClick={() => folderRef.current?.click()} style={btnStyle}>
              Folder
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error non-standard but widely supported
            webkitdirectory=""
            multiple
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          {files.length > 0 && (
            <div style={{ color: "#a3a3a3", fontSize: 13 }}>
              {files.length} file{files.length === 1 ? "" : "s"} selected (
              {(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} KB)
            </div>
          )}
        </div>
      </Field>

      {error && <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{error}</p>}

      <button type="submit" disabled={busy || !name || files.length === 0} style={primaryBtnStyle}>
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#d4d4d4" }}>{label}</span>
      {children}
    </label>
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
    <div style={{ ...formStyle, gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Prototype created</h2>
      <Row label="URL" value={result.url} mono />
      {result.accessCode && <Row label="Access code" value={result.accessCode} mono />}
      <Row
        label="Expires"
        value={result.expiresAt ? new Date(result.expiresAt).toLocaleString() : "Never"}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onReset} style={btnStyle}>Upload another</button>
        <a href="/dashboard" style={{ ...btnStyle, textDecoration: "none" }}>To dashboard</a>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#a3a3a3" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code
          style={{
            background: "#0a0a0a",
            border: "1px solid #262626",
            borderRadius: 6,
            padding: "8px 10px",
            fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit",
            fontSize: 13,
            flex: 1,
            overflow: "auto",
          }}
        >
          {value}
        </code>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      style={btnStyle}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "#141414",
  border: "1px solid #262626",
  borderRadius: 12,
  padding: 24,
};
const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#fff",
  fontSize: 14,
};
const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #333",
  borderRadius: 6,
  color: "#fff",
  padding: "8px 12px",
  fontSize: 13,
  cursor: "pointer",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "#fff",
  color: "#0a0a0a",
  border: 0,
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
const pillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#fff" : "transparent",
  color: active ? "#0a0a0a" : "#d4d4d4",
  border: active ? "1px solid #fff" : "1px solid #333",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
});
