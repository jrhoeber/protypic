import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
          Upload
        </h1>
      </header>
      <UploadForm />
    </main>
  );
}
