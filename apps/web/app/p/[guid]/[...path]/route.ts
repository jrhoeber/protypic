import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Storage } from "@google-cloud/storage";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { verifyUnlockCookie } from "@/lib/prototype-session";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Defense in depth. GCS object names are literal strings (no traversal
// semantics), but reject `..`, control chars, slashes/backslashes anyway so the
// request can't surprise any layer in front of GCS.
const SEGMENT_BAD = /[\x00-\x1f\x7f\\/]|^\.{1,2}$|\.\./;

let _storage: Storage | null = null;
function storage(): Storage {
  if (!_storage) {
    const opts: ConstructorParameters<typeof Storage>[0] = { projectId: env.projectId() };
    const emulator = env.storageEmulator();
    if (emulator) {
      opts.apiEndpoint = emulator.startsWith("http") ? emulator : `http://${emulator}`;
    }
    _storage = new Storage(opts);
  }
  return _storage;
}

const ASSET_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "private, max-age=3600, must-revalidate",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { guid: string; path: string[] } },
) {
  const host = (headers().get("host") ?? "").split(":")[0]!.toLowerCase();
  if (host !== env.viewHost().toLowerCase()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!verifyUnlockCookie(params.guid)) {
    return NextResponse.redirect(`${env.viewBaseUrl()}/p/${params.guid}`, 302);
  }

  if (
    params.path.length === 0 ||
    params.path.length > 32 ||
    !params.path.every((s) => s.length > 0 && s.length <= 256 && !SEGMENT_BAD.test(s))
  ) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const p = await getPrototype(params.guid);
  if (!p || isExpired(p)) return new NextResponse("Not Found", { status: 404 });

  const objectName = `p/${params.guid}/${params.path.join("/")}`;
  const file = storage().bucket(env.bucket()).file(objectName);

  const [exists] = await file.exists();
  if (!exists) return new NextResponse("Not Found", { status: 404 });
  const [meta] = await file.getMetadata();

  const etag = meta.etag;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (etag && ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ...ASSET_HEADERS, etag },
    });
  }

  const stream = file.createReadStream();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  const headersOut: Record<string, string> = {
    ...ASSET_HEADERS,
    "content-type": meta.contentType ?? "application/octet-stream",
  };
  if (meta.size) headersOut["content-length"] = String(meta.size);
  if (etag) headersOut.etag = etag;

  return new NextResponse(body, { headers: headersOut });
}
