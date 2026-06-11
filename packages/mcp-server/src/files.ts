import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep, posix } from "node:path";

export type LoadedFile = { path: string; contentBase64: string };

export async function loadPath(input: string): Promise<LoadedFile[]> {
  const st = await stat(input);
  if (st.isFile()) {
    const buf = await readFile(input);
    const name = input.split(sep).pop() || "index.html";
    return [{ path: name, contentBase64: buf.toString("base64") }];
  }
  if (!st.isDirectory()) {
    throw new Error(`Not a file or directory: ${input}`);
  }
  const out: LoadedFile[] = [];
  await walk(input, input, out);
  return out;
}

async function walk(root: string, dir: string, out: LoadedFile[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.name === "node_modules") continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(root, abs, out);
    } else if (e.isFile()) {
      const rel = relative(root, abs).split(sep).join(posix.sep);
      const buf = await readFile(abs);
      out.push({ path: rel, contentBase64: buf.toString("base64") });
    }
  }
}
