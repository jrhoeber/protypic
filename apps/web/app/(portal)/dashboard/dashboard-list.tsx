"use client";

import { useMemo, useState } from "react";
import type { Prototype } from "@protypic/shared";

export function DashboardList({
  prototypes: initial,
  viewBaseUrl,
}: {
  prototypes: Prototype[];
  viewBaseUrl: string;
}) {
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  function flashCopy(label: string) {
    setFlash(label);
    setTimeout(() => setFlash(null), 1400);
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    flashCopy("Link copied");
  }

  async function remove(id: string) {
    if (!confirm("Delete this prototype? This can't be undone.")) return;
    setBusyId(id);
    const res = await fetch(`/api/prototypes/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else alert("Delete failed.");
    setBusyId(null);
  }

  async function rotate(id: string): Promise<string | null> {
    setRotatingId(id);
    try {
      const res = await fetch(`/api/prototypes/${id}/rotate-access-code`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        alert(body?.error ?? "Failed to generate access code.");
        return null;
      }
      const body = (await res.json()) as { accessCode: string };
      await navigator.clipboard.writeText(body.accessCode).catch(() => {});
      return body.accessCode;
    } finally {
      setRotatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        className="input"
      />

      {filtered.length === 0 ? (
        <p style={noMatchStyle}>No prototypes match “{query}”.</p>
      ) : (
        <ul className="divided row-list" style={listStyle}>
          {filtered.map((p) => {
            const url = `${viewBaseUrl}/p/${p.id}`;
            const status = computeStatus(p);
            return (
              <li key={p.id} className="stack-on-sm" style={rowStyle}>
                <div style={textBlock}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={nameStyle}
                    title="Open prototype"
                  >
                    {p.name}
                  </a>
                  <div style={metaStyle}>
                    <span className={`dot ${status.tone}`} aria-hidden />
                    <span>{status.label}</span>
                  </div>
                </div>
                <div className="row-actions" style={actionsStyle}>
                  <button
                    className="btn btn-default"
                    onClick={() => copyLink(url)}
                    title="Copy link"
                  >
                    <LinkIcon />
                    <span>Copy link</span>
                  </button>
                  {p.isProtected && (
                    <NewAccessCodeButton
                      url={url}
                      expiresAt={p.expiresAt}
                      busy={rotatingId === p.id}
                      onRotate={() => rotate(p.id)}
                    />
                  )}
                  <button
                    className="btn btn-icon"
                    onClick={() => remove(p.id)}
                    disabled={busyId === p.id}
                    title="Delete"
                    aria-label="Delete prototype"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {flash && <Toast text={flash} />}
    </div>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <div role="status" style={toastStyle}>
      <CheckIcon />
      <span>{text}</span>
    </div>
  );
}

type Status = { label: string; tone: "dot-ok" | "dot-warn" | "dot-dim" | "dot-danger" };

function computeStatus(p: Prototype): Status {
  if (!p.expiresAt) {
    return {
      label: p.isProtected ? "Protected · no expiration" : "Public · no expiration",
      tone: p.isProtected ? "dot-ok" : "dot-dim",
    };
  }
  const exp = new Date(p.expiresAt).getTime();
  const now = Date.now();
  const days = Math.round((exp - now) / 86_400_000);
  if (days < 0) {
    return { label: `Expired ${formatDate(p.expiresAt)}`, tone: "dot-danger" };
  }
  const protectedTag = p.isProtected ? "Protected · " : "Public · ";
  const expiresPhrase =
    days === 0 ? "expires today" : days <= 3 ? `expires in ${days}d` : `expires ${formatDate(p.expiresAt)}`;
  const tone: Status["tone"] = days <= 3 ? "dot-warn" : p.isProtected ? "dot-ok" : "dot-dim";
  return { label: `${protectedTag}${expiresPhrase}`, tone };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NewAccessCodeButton({
  url,
  expiresAt,
  busy,
  onRotate,
}: {
  url: string;
  expiresAt: string | null;
  busy: boolean;
  onRotate: () => Promise<string | null>;
}) {
  const [step, setStep] = useState<"closed" | "confirm" | "result">("closed");
  const [code, setCode] = useState<string | null>(null);

  function close() {
    setStep("closed");
    setCode(null);
  }

  async function confirm() {
    const next = await onRotate();
    if (next) {
      setCode(next);
      setStep("result");
    } else {
      setStep("closed");
    }
  }

  return (
    <>
      <button
        className="btn btn-ghost"
        onClick={() => setStep("confirm")}
        disabled={busy}
        title="Generate a new access code"
      >
        New code
      </button>
      {step !== "closed" && (
        <Modal onClose={close}>
          {step === "confirm" ? (
            <>
              <h2 style={modalTitle}>Generate a new access code?</h2>
              <p style={modalBody}>
                The current code is deleted and stops working immediately.
                Anyone holding it will be locked out.
              </p>
              <div style={modalActions}>
                <button className="btn btn-ghost" onClick={close}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={confirm} disabled={busy}>
                  {busy ? "Generating…" : "Generate"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 style={modalTitle}>New access code</h2>
              <p style={modalBody}>
                Save it now — it's shown only once. Already on your clipboard.
              </p>
              <Field label="Code" value={code ?? ""} mono primary />
              <Field label="Link" value={url} mono />
              <Field
                label="Expires"
                value={expiresAt ? new Date(expiresAt).toLocaleString() : "Never"}
              />
              <div style={modalActions}>
                <button className="btn btn-primary" onClick={close}>
                  Done
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={card}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  primary,
}: {
  label: string;
  value: string;
  mono?: boolean;
  primary?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div style={fieldStyle}>
      <span style={fieldLabel}>{label}</span>
      <div
        style={{
          ...fieldRow,
          ...(primary ? { borderColor: "#3a3a3a", background: "#1c1c1c" } : {}),
        }}
      >
        <div
          style={{
            ...fieldValue,
            fontFamily: mono ? "var(--font-mono)" : undefined,
            fontSize: primary ? 14 : 12.5,
            color: "var(--text)",
          }}
        >
          {value}
        </div>
        <button
          className="btn btn-icon"
          type="button"
          onClick={copy}
          title={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
          aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  overflow: "hidden",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "16px 18px",
};
const textBlock: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
  flex: 1,
};
const nameStyle: React.CSSProperties = {
  fontSize: 14.5,
  fontWeight: 500,
  color: "var(--text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const metaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--text-muted)",
  fontSize: 12.5,
};
const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
};
const noMatchStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "24px 16px",
  textAlign: "center",
  border: "1px solid var(--border)",
  borderRadius: 8,
  margin: 0,
};
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 50,
};
const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-hover)",
  borderRadius: 10,
  padding: 22,
  width: "100%",
  maxWidth: 440,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
};
const modalTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 15.5,
  fontWeight: 600,
  letterSpacing: -0.1,
};
const modalBody: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: 13,
  lineHeight: 1.55,
};
const modalActions: React.CSSProperties = {
  display: "flex",
  gap: 6,
  justifyContent: "flex-end",
  marginTop: 6,
};
const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--text-muted)",
};
const fieldRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  padding: "0 6px 0 10px",
  height: 36,
};
const fieldValue: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const toastStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--text)",
  color: "var(--bg)",
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 500,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  zIndex: 60,
};
