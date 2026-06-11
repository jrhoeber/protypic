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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Token name (e.g. 'laptop')"
          style={inputStyle}
        />
        <button onClick={create} disabled={busy || !newName.trim()} style={primaryBtnStyle}>
          {busy ? "Creating…" : "Create token"}
        </button>
      </div>

      {justCreated && (
        <div style={alertStyle}>
          <strong style={{ fontSize: 14 }}>Token created — copy it now.</strong>
          <code style={codeStyle}>{justCreated.token}</code>
          <button onClick={() => setJustCreated(null)} style={btnStyle}>Dismiss</button>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {tokens.length === 0 ? (
          <li style={{ color: "#a3a3a3", fontSize: 14 }}>No tokens yet.</li>
        ) : (
          tokens.map((t) => (
            <li key={t.id} style={itemStyle}>
              <div>
                <div style={{ fontWeight: 500 }}>{t.name}</div>
                <div style={{ color: "#a3a3a3", fontSize: 12 }}>
                  Created {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : " · never used"}
                </div>
              </div>
              <button onClick={() => revoke(t.id)} style={{ ...btnStyle, color: "#fca5a5" }}>
                Revoke
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #333",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#fff",
  fontSize: 14,
  flex: 1,
};
const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #333",
  borderRadius: 6,
  color: "#fff",
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "#fff",
  color: "#0a0a0a",
  border: 0,
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  background: "#141414",
  border: "1px solid #262626",
  borderRadius: 8,
};
const alertStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  background: "#1f1f0a",
  border: "1px solid #4a4a1a",
  borderRadius: 8,
};
const codeStyle: React.CSSProperties = {
  background: "#0a0a0a",
  padding: "8px 10px",
  borderRadius: 6,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 13,
  wordBreak: "break-all",
};
