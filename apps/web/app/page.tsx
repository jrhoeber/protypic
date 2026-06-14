import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromSessionCookie } from "../lib/auth";

export default async function HomePage() {
  const user = await getUserFromSessionCookie();
  if (user) redirect("/dashboard");

  return (
    <main style={page}>
      <div style={shell}>
        <h1 style={brand}>protypic</h1>
        <p style={tagline}>Share a prototype as a link.</p>
        <p style={blurb}>
          Drop in an HTML file or a folder of static assets. Get a URL,
          an access code, and an expiration date.
        </p>
        <div style={ctaRow}>
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
          <a
            href="https://www.npmjs.com/package/@protypic/mcp"
            target="_blank"
            rel="noreferrer"
            style={mcpPill}
          >
            npm i @protypic/mcp
          </a>
        </div>
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 24,
};
const shell: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const brand: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: -0.2,
};
const tagline: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "var(--text)",
};
const blurb: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 13.5,
  color: "var(--text-muted)",
  lineHeight: 1.6,
};
const ctaRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};
const mcpPill: React.CSSProperties = {
  color: "var(--text-muted)",
  padding: "0 12px",
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 6,
  fontSize: 12.5,
  border: "1px solid var(--border)",
  fontFamily: "var(--font-mono)",
};
