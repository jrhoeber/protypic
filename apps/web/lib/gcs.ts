import { Storage } from "@google-cloud/storage";
import { contentTypeFor, type ValidatedFile } from "./file-validation";
import { env } from "./env";

let _storage: Storage | null = null;
function storage() {
  if (!_storage) {
    const opts: ConstructorParameters<typeof Storage>[0] = {
      projectId: env.projectId(),
    };
    const emulator = env.storageEmulator();
    if (emulator) {
      opts.apiEndpoint = emulator.startsWith("http") ? emulator : `http://${emulator}`;
    }
    _storage = new Storage(opts);
  }
  return _storage;
}

function bucket() {
  return storage().bucket(env.bucket());
}

// Object names must match the URL path served by the streaming route at
// apps/web/app/p/[guid]/[...path]/route.ts.
export async function uploadPrototypeFiles(id: string, files: ValidatedFile[]): Promise<void> {
  const prefix = gcsPrefix(id);
  await Promise.all(
    files.map((f) =>
      bucket()
        .file(prefix + f.path)
        .save(f.bytes, {
          contentType: contentTypeFor(f.path),
          resumable: false,
          metadata: {
            cacheControl: "public, max-age=31536000, immutable",
          },
        }),
    ),
  );
}

export async function deletePrototypeFiles(id: string): Promise<void> {
  await bucket().deleteFiles({ prefix: gcsPrefix(id), force: true });
}

function gcsPrefix(id: string): string {
  return `p/${id}/`;
}
