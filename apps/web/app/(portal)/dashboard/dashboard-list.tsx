"use client";

import { useState } from "react";
import type { Prototype } from "@protypic/shared";

export function DashboardList({ prototypes: initial }: { prototypes: Prototype[] }) {
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this prototype? This can't be undone.")) return;
    setBusyId(id);
    const res = await fetch(`/api/prototypes/${id}`, { method: "DELETE" });
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else alert("Delete failed.");
    setBusyId(null);
  }

  return (
    <ul style={listStyle}>
      {items.map((p) => {
        const url = `${typeof window === "undefined" ? "" : window.location.origin}/p/${p.id}`;
        return (
          <li key={p.id} style={itemStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <strong style={{ fontSize: 16 }}>{p.name}</strong>
                <span style={chipStyle(p.isProtected ? "#262626" : "#1a3a1a")}>
                  {p.isProtected ? "Protected" : "Public"}
                </span>
              </div>
              <div style={{ color: "#a3a3a3", fontSize: 13 }}>
                Created {new Date(p.createdAt).toLocaleDateString()}{" · "}
                {p.expiresAt
                  ? `Expires ${new Date(p.expiresAt).toLocaleDateString()}`
                  : "Never expires"}{" · "}
                {p.fileCount} files
              </div>
              <code style={urlStyle}>{url}</code>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <CopyButton text={url} label="Copy link" />
              <a href={url} target="_blank" rel="noreferrer" style={btnStyle}>Open</a>
              <button
                onClick={() => remove(p.id)}
                disabled={busyId === p.id}
                style={{ ...btnStyle, color: "#fca5a5", borderColor: "#3a1f1f" }}
              >
                {busyId === p.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
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
      {copied ? "Copied" : label}
    </button>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const itemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  padding: 16,
  background: "#141414",
  border: "1px solid #262626",
  borderRadius: 10,
};
const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #333",
  borderRadius: 6,
  color: "#fff",
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "none",
};
const chipStyle = (bg: string): React.CSSProperties => ({
  fontSize: 11,
  background: bg,
  color: "#d4d4d4",
  padding: "2px 8px",
  borderRadius: 999,
});
const urlStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  color: "#a3a3a3",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
