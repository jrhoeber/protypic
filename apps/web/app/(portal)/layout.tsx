import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUserFromSessionCookie } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getUserFromSessionCookie();
  if (!user) redirect("/login");

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <Link href="/dashboard" style={brandStyle}>protypic</Link>
          <nav style={navStyle}>
            <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
            <Link href="/upload" style={linkStyle}>Upload</Link>
            <Link href="/settings" style={linkStyle}>Settings</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border)",
  background: "var(--bg)",
};
const headerInnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 24px",
  maxWidth: 960,
  width: "100%",
  margin: "0 auto",
};
const brandStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
  letterSpacing: -0.2,
  textDecoration: "none",
  color: "var(--text)",
};
const navStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  alignItems: "center",
};
const linkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "var(--text-muted)",
  fontSize: 13.5,
  padding: "6px 10px",
  borderRadius: 6,
};
const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: "40px 24px 64px",
  maxWidth: 960,
  width: "100%",
  margin: "0 auto",
};
