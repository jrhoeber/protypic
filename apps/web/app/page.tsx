import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromSessionCookie } from "../lib/auth";

export default async function HomePage() {
  const user = await getUserFromSessionCookie();
  if (user) redirect("/dashboard");

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>protypic</h1>
        <p style={styles.tagline}>Share vibe-coded prototypes via short URLs.</p>
        <p style={styles.sub}>
          Drop in a single HTML file or a folder of static assets. Get back a
          link, an access code, and an expiration date.
        </p>
        <div style={styles.ctas}>
          <Link href="/login" style={styles.cta}>
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  hero: {
    maxWidth: 520,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  title: {
    margin: 0,
    fontSize: 48,
    fontWeight: 700,
    letterSpacing: -1.5,
    color: "var(--text)",
  },
  tagline: {
    margin: 0,
    fontSize: 16,
    color: "var(--text-muted)",
  },
  sub: {
    margin: 0,
    color: "var(--text-dim)",
    fontSize: 14,
    lineHeight: 1.6,
  },
  ctas: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginTop: 12,
  },
  cta: {
    background: "var(--text)",
    color: "var(--bg)",
    border: "1px solid var(--text)",
    borderRadius: 8,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
  },
};
