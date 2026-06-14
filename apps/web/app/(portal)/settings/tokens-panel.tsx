"use client";

import { useState } from "react";
import type { ApiToken, ApiTokenWithSecret } from "@protypic/shared";

export function TokensPanel({ initial }: { initial: ApiToken[] }) {
  const [tokens, setTokens] = useState(initial);
  const [newName, setNewName] = useState("");
  const [justCreated, setJustCreated] = useState<ApiTokenWithSecret | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setBusy(false);
    if (!res.ok) return alert("Could not create token.");
    const t = (await res.json()) as ApiTokenWithSecret;
    setJustCreated(t);
    setTokens((xs) => [{ id: t.id, name: t.name, createdAt: t.createdAt, lastUsedAt: t.lastUsedAt }, ...xs]);
    setNewName("");
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this token?")) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) setTokens((xs) => xs.filter((t) => t.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={createRow}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Token name (e.g. laptop)"
          className="input"
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
        />
        <button onClick={create} disabled={busy || !newName.trim()} className="btn btn-primary">
          {busy ? "Creating…" : "Create"}
        </button>
      </div>

      {justCreated && <NewTokenAlert token={justCreated} onDismiss={() => setJustCreated(null)} />}

      {tokens.length === 0 ? (
        <p style={emptyText}>No tokens yet.</p>
      ) : (
        <ul className="divided" style={listStyle}>
          {tokens.map((t) => (
            <li key={t.id} style={rowStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</span>
                <span style={metaText}>
                  Created {new Date(t.createdAt).toLocaleDateString()}
                  {" · "}
                  {t.lastUsedAt
                    ? `last used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                    : "never used"}
                </span>
              </div>
              <button onClick={() => revoke(t.id)} className="btn btn-ghost danger">
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewTokenAlert({ token, onDismiss }: { token: ApiTokenWithSecret; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(token.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={alertStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: 13, fontWeight: 600 }}>Save this token now</strong>
        <button onClick={onDismiss} className="btn btn-ghost" style={{ height: 22, padding: "0 6px" }}>
          Dismiss
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 12.5 }}>
        It won't be shown again.
      </p>
      <div style={tokenRow}>
        <code style={tokenCode}>{token.token}</code>
        <button onClick={copy} className="btn btn-primary" style={{ height: 30 }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

const createRow: React.CSSProperties = {
  display: "flex",
  gap: 6,
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
};
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  gap: 12,
};
const metaText: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 12,
};
const emptyText: React.CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "12px 4px",
};
const alertStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  background: "var(--surface)",
  border: "1px solid var(--border-hover)",
  borderRadius: 8,
};
const tokenRow: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: 6,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 6px 6px 12px",
  height: 42,
};
const tokenCode: React.CSSProperties = {
  flex: 1,
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  color: "var(--text)",
  background: "transparent",
  wordBreak: "break-all",
  alignSelf: "center",
};
