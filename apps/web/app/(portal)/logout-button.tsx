"use client";

import { signOut } from "@/lib/firebase-client";

export function LogoutButton() {
  async function logout() {
    await signOut();
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/";
  }
  return (
    <button onClick={logout} style={style}>
      Sign out
    </button>
  );
}

const style: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  padding: "6px 10px",
  fontSize: 13.5,
  cursor: "pointer",
  borderRadius: 6,
};
