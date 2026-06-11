import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Upload a prototype</h1>
      <p style={{ color: "#a3a3a3", margin: 0 }}>
        Select a single HTML file or a folder of static frontend files. Must contain an
        <code style={{ background: "#1f1f1f", padding: "1px 6px", borderRadius: 4 }}>index.html</code>{" "}
        at the root.
      </p>
      <UploadForm />
    </main>
  );
}
