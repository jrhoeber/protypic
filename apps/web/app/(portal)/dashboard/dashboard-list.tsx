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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        style={searchStyle}
      />
      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-dim)", margin: 0, fontSize: 13 }}>
          No prototypes match “{query}”.
        </p>
      ) : (
        <ul style={listStyle}>
          {filtered.map((p) => {
            const url = `${viewBaseUrl}/p/${p.id}`;
            return (
              <li key={p.id} style={itemStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, flex: 1 }}>
                  <div style={titleRowStyle}>
                    <h3 style={nameStyle}>{p.name}</h3>
                    {p.isProtected && <span style={chipStyle}>Protected</span>}
                  </div>
                  <div style={metaStyle}>
                    <span>Created {formatDate(p.createdAt)}</span>
                    <Dot />
                    <span>
                      {p.expiresAt ? `Expires ${formatDate(p.expiresAt)}` : "Never expires"}
                    </span>
                    <Dot />
                    <span>
                      {p.fileCount} {p.fileCount === 1 ? "file" : "files"}
                    </span>
                  </div>
                  <CopyableUrl url={url} />
                </div>
                <div style={actionsStyle}>
                  {p.isProtected && (
                    <NewAccessCodeButton
                      url={url}
                      expiresAt={p.expiresAt}
                      busy={rotatingId === p.id}
                      onRotate={() => rotate(p.id)}
                    />
                  )}
                  <DeleteButton
                    busy={busyId === p.id}
                    onClick={() => remove(p.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Dot() {
  return <span aria-hidden style={{ color: "var(--text-dim)", opacity: 0.5 }}>·</span>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div style={urlRowStyle}>
      <a href={url} target="_blank" rel="noreferrer" style={urlLinkStyle}>
        {url}
      </a>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : "Copy URL"}
        aria-label={copied ? "Copied" : "Copy URL"}
        style={iconBtnStyle}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function DeleteButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={busy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...ghostBtnStyle,
        color: hover ? "var(--danger)" : "var(--text-muted)",
        background: hover ? "var(--danger-bg)" : "transparent",
        borderColor: hover ? "rgba(248, 113, 113, 0.25)" : "var(--border-strong)",
      }}
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
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
        onClick={() => setStep("confirm")}
        disabled={busy}
        style={ghostBtnStyle}
      >
        New access code
      </button>
      {step !== "closed" && (
        <Modal onClose={close}>
          {step === "confirm" ? (
            <>
              <h2 style={modalTitleStyle}>Generate a new access code?</h2>
              <p style={modalBodyStyle}>
                The current access code will be permanently deleted and stop
                working immediately. Anyone with the old code will be locked out.
              </p>
              <div style={modalActionsStyle}>
                <button onClick={close} style={ghostBtnStyle}>
                  Cancel
                </button>
                <button onClick={confirm} disabled={busy} style={primaryBtnStyle}>
                  {busy ? "Generating…" : "Generate"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 style={modalTitleStyle}>New access code ready</h2>
              <p style={modalBodyStyle}>
                Save this now — the code is only shown once.
              </p>
              <Field label="Link" value={url} />
              <Field label="Access code" value={code ?? ""} mono />
              <Field
                label="Expires"
                value={expiresAt ? new Date(expiresAt).toLocaleString() : "Never"}
              />
              <div style={modalActionsStyle}>
                <button onClick={close} style={primaryBtnStyle}>
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
    <div role="dialog" aria-modal="true" onClick={onClose} style={modalOverlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div style={fieldStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={fieldRowStyle}>
        <div
          style={{
            ...fieldValueStyle,
            fontFamily: mono
              ? "ui-monospace, SFMono-Regular, Menlo, monospace"
              : undefined,
          }}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={copy}
          title={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
          aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
          style={iconBtnStyle}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </div>
  );
}

const searchStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: 13.5,
  outline: "none",
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const itemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "center",
  padding: "16px 18px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
};
const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};
const nameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: -0.1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const metaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
  color: "var(--text-dim)",
  fontSize: 12.5,
};
const chipStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 500,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  background: "transparent",
  border: "1px solid var(--border-strong)",
  padding: "2px 7px",
  borderRadius: 999,
  flexShrink: 0,
};
const urlRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  marginTop: 2,
};
const urlLinkStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  color: "var(--text-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textDecoration: "none",
};
const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexShrink: 0,
};
const ghostBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  color: "var(--text-muted)",
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "var(--text)",
  border: "1px solid var(--text)",
  borderRadius: 6,
  color: "var(--bg)",
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 5,
  color: "var(--text-dim)",
  padding: 4,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 50,
};
const modalCardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  width: "100%",
  maxWidth: 460,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
};
const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 17,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: -0.2,
};
const modalBodyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: 13.5,
  lineHeight: 1.55,
};
const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  marginTop: 8,
};
const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "var(--text-dim)",
  fontWeight: 500,
};
const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 10px",
};
const fieldValueStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: "var(--text)",
  fontSize: 12.5,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
