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
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Your prototypes</h1>
        <Link href="/upload" style={uploadBtn}>+ New prototype</Link>
      </header>
      {prototypes.length === 0 ? (
        <p style={{ color: "#a3a3a3" }}>
          No prototypes yet. <Link href="/upload" style={{ color: "#fff" }}>Upload one</Link>.
        </p>
      ) : (
        <DashboardList prototypes={prototypes} viewBaseUrl={env.viewBaseUrl()} />
      )}
    </main>
  );
}

const uploadBtn: React.CSSProperties = {
  background: "#fff",
  color: "#0a0a0a",
  textDecoration: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 600,
  fontSize: 14,
};
