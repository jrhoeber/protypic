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
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
          Prototypes
        </h1>
        <Link href="/upload" className="btn btn-primary">
          <PlusIcon />
          <span>New</span>
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
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "48px 24px",
        textAlign: "center",
        background: "var(--surface)",
      }}
    >
      <p style={{ margin: "0 0 14px", color: "var(--text-muted)", fontSize: 13.5 }}>
        Nothing here yet.
      </p>
      <Link href="/upload" className="btn btn-default">
        <PlusIcon />
        <span>Upload a prototype</span>
      </Link>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
