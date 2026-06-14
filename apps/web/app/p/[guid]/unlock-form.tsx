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
        <span style={styles.brand}>protypic</span>
        <h1 style={styles.title}>{name}</h1>
        <p style={styles.subtitle}>Enter the access code to view.</p>
        <input
          autoFocus
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          className="input"
          style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={busy || !code.trim()} className="btn btn-primary" style={{ width: "100%", height: 38 }}>
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
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  brand: {
    fontSize: 12.5,
    color: "var(--text-muted)",
    fontWeight: 500,
  },
  title: {
    margin: "2px 0 0",
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: -0.2,
    color: "var(--text)",
  },
  subtitle: {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: 13,
  },
  error: { margin: 0, color: "var(--danger)", fontSize: 12.5 },
};
