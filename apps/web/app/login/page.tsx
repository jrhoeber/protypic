"use client";

import { useState } from "react";
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
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Sign in</h1>
        <p style={{ margin: 0, color: "#a3a3a3", fontSize: 14 }}>
          protypic uses Google for sign-in.
        </p>
        <button onClick={login} disabled={busy} style={buttonStyle}>
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
        {error && <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{error}</p>}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 24,
};
const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  background: "#141414",
  border: "1px solid #262626",
  borderRadius: 12,
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};
const buttonStyle: React.CSSProperties = {
  background: "#fff",
  color: "#0a0a0a",
  border: 0,
  borderRadius: 8,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
