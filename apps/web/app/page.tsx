import Link from "next/link";

export default function HomePage() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <h1 style={styles.title}>protypic</h1>
        <p style={styles.tagline}>Share vibe-coded prototypes via short URLs.</p>
        <p style={styles.sub}>
          Drop in a single HTML file or a folder of static assets. Get back a link, an
          access code, and an expiration date.
        </p>
        <div style={styles.ctas}>
          <Link href="/dashboard" style={styles.primaryCta}>Open dashboard</Link>
          <Link href="/login" style={styles.secondaryCta}>Sign in</Link>
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
  hero: { maxWidth: 560, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 },
  title: { margin: 0, fontSize: 56, fontWeight: 700, letterSpacing: -1 },
  tagline: { margin: 0, fontSize: 18, color: "#d4d4d4" },
  sub: { margin: 0, color: "#a3a3a3", lineHeight: 1.55 },
  ctas: { display: "flex", gap: 12, justifyContent: "center", marginTop: 8 },
  primaryCta: {
    background: "#fff", color: "#0a0a0a", borderRadius: 8,
    padding: "10px 16px", fontWeight: 600, textDecoration: "none",
  },
  secondaryCta: {
    background: "transparent", color: "#fff", border: "1px solid #333", borderRadius: 8,
    padding: "10px 16px", fontWeight: 500, textDecoration: "none",
  },
};
