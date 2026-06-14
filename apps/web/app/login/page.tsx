"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientAuth, signInWithGoogle } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      const idToken = await clientAuth().currentUser!.getIdToken();
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Session exchange failed");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main style={page}>
      <div style={shell}>
        <Link href="/" style={brand}>protypic</Link>
        <h1 style={title}>Sign in</h1>
        <button onClick={login} disabled={busy} className="btn btn-primary" style={{ width: "100%", height: 38 }}>
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
        {error && <p style={errStyle}>{error}</p>}
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 24,
};
const shell: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const brand: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-muted)",
  fontWeight: 500,
};
const title: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: -0.2,
};
const errStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--danger)",
  fontSize: 12.5,
};
