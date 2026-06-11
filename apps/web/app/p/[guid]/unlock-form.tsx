"use client";

import { useState, type FormEvent } from "react";

export function UnlockForm({ prototypeId, name }: { prototypeId: string; name: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/p/${prototypeId}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessCode: code.trim() }),
    });
    if (res.redirected) {
      window.location.href = res.url;
      return;
    }
    if (res.ok) {
      window.location.href = `/p/${prototypeId}`;
      return;
    }
    setError(res.status === 401 ? "Wrong access code." : "Something went wrong.");
    setBusy(false);
  }

  return (
    <main style={styles.page}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{name}</h1>
        <p style={styles.subtitle}>Enter the access code to view this prototype.</p>
        <input
          autoFocus
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={busy || !code.trim()} style={styles.button}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    background: "#0a0a0a",
    color: "#fff",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    padding: 24,
  },
  card: {
    background: "#141414",
    border: "1px solid #262626",
    borderRadius: 12,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 600 },
  subtitle: { margin: 0, color: "#a3a3a3", fontSize: 14 },
  input: {
    background: "#0a0a0a",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#fff",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
  },
  button: {
    background: "#fff",
    color: "#0a0a0a",
    border: 0,
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { margin: 0, color: "#fca5a5", fontSize: 13 },
};
