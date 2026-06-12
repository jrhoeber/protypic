import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromSessionCookie } from "@/lib/auth";
import { listPrototypesForUser } from "@/lib/prototypes";
import { env } from "@/lib/env";
import { DashboardList } from "./dashboard-list";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUserFromSessionCookie();
  if (!user) redirect("/login");

  const prototypes = await listPrototypesForUser(user.uid);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Your prototypes</h1>
          <p style={subtitleStyle}>
            {prototypes.length === 0
              ? "Nothing here yet."
              : `${prototypes.length} ${prototypes.length === 1 ? "prototype" : "prototypes"}`}
          </p>
        </div>
        <Link href="/upload" style={uploadBtn}>
          New prototype
        </Link>
      </header>
      {prototypes.length === 0 ? (
        <EmptyState />
      ) : (
        <DashboardList prototypes={prototypes} viewBaseUrl={env.viewBaseUrl()} />
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div style={emptyStyle}>
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        No prototypes yet.{" "}
        <Link href="/upload" style={{ color: "var(--text)", textDecoration: "underline", textDecorationColor: "var(--border-strong)" }}>
          Upload your first one
        </Link>
        .
      </p>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
};
const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: -0.3,
};
const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "var(--text-dim)",
  fontSize: 13,
};
const uploadBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  textDecoration: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 500,
  fontSize: 13.5,
  border: "1px solid var(--border-strong)",
};
const emptyStyle: React.CSSProperties = {
  border: "1px dashed var(--border-strong)",
  borderRadius: 12,
  padding: "48px 24px",
  textAlign: "center",
  background: "var(--surface)",
};
