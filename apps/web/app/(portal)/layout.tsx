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
        <div style={headerInner}>
          <Link href="/dashboard" style={brand}>protypic</Link>
          <nav style={nav}>
            <NavLink href="/dashboard">Prototypes</NavLink>
            <NavLink href="/settings">Settings</NavLink>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <div style={content}>{children}</div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={linkStyle}>
      {children}
    </Link>
  );
}

const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--border)",
  background: "var(--bg)",
};
const headerInner: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 24px",
  maxWidth: 880,
  width: "100%",
  margin: "0 auto",
  gap: 16,
};
const brand: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text)",
  letterSpacing: -0.1,
};
const nav: React.CSSProperties = {
  display: "flex",
  gap: 2,
  alignItems: "center",
};
const linkStyle: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 5,
  transition: "color 120ms",
};
const content: React.CSSProperties = {
  flex: 1,
  padding: "40px 24px 80px",
  maxWidth: 880,
  width: "100%",
  margin: "0 auto",
};
