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
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Settings</h1>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>MCP API tokens</h2>
        <p style={{ margin: 0, color: "#a3a3a3", fontSize: 14 }}>
          Create a token to use with <code>@protypic/mcp</code>. Tokens are shown once on
          creation — store them securely.
        </p>
        <TokensPanel initial={tokens} />
      </section>
    </main>
  );
}
