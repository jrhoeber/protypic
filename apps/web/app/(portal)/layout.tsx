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
        <Link href="/dashboard" style={brandStyle}>protypic</Link>
        <nav style={navStyle}>
          <Link href="/dashboard" style={linkStyle}>Dashboard</Link>
          <Link href="/upload" style={linkStyle}>Upload</Link>
          <Link href="/settings" style={linkStyle}>Settings</Link>
          <LogoutButton />
        </nav>
      </header>
      <div style={{ flex: 1, padding: "32px 24px", maxWidth: 960, width: "100%", margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 24px",
  borderBottom: "1px solid #1f1f1f",
};
const brandStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 18,
  textDecoration: "none",
};
const navStyle: React.CSSProperties = { display: "flex", gap: 16, alignItems: "center" };
const linkStyle: React.CSSProperties = { textDecoration: "none", color: "#d4d4d4", fontSize: 14 };
