export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>404</h1>
        <p style={{ marginTop: 8, color: "#a3a3a3" }}>
          This prototype isn&apos;t here. It may have expired or never existed.
        </p>
      </div>
    </main>
  );
}
