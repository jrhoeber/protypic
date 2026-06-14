import { redirect } from "next/navigation";
import { getUserFromSessionCookie } from "@/lib/auth";
import { listTokens } from "@/lib/tokens";
import { TokensPanel } from "./tokens-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUserFromSessionCookie();
  if (!user) redirect("/login");
  const tokens = await listTokens(user.uid);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
          Settings
        </h1>
      </header>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>API tokens</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 12.5 }}>
            For use with{" "}
            <code style={inlineCode}>@protypic/mcp</code>. Shown once on
            creation — store securely.
          </p>
        </div>
        <TokensPanel initial={tokens} />
      </section>
    </main>
  );
}

const inlineCode: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  padding: "1px 5px",
  borderRadius: 3,
  color: "var(--text)",
};
