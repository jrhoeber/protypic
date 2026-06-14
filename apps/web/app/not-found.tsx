import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>
          Not found
        </h1>
        <p style={{ margin: "6px 0 16px", color: "var(--text-muted)", fontSize: 13.5 }}>
          This prototype may have expired or never existed.
        </p>
        <Link href="/" className="btn btn-default">← Home</Link>
      </div>
    </main>
  );
}
