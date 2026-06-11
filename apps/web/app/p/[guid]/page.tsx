import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { buildPrototypeCookie } from "@/lib/signed-cookie";
import { env } from "@/lib/env";
import { UnlockForm } from "./unlock-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_FLAG = (id: string) => `protypic_unlocked_${id}`;

function assetUrl(id: string, file: string): string {
  const base = env.cdnBaseUrl().replace(/\/+$/, "");
  return `${base}/p/${id}/${file}`;
}

function setPrototypeCookie(id: string, expiresAt: Date | null): string {
  const c = buildPrototypeCookie(id, expiresAt);
  const store = cookies();
  store.set(c.name, c.value, { path: c.path, expires: c.expiresAt, secure: true, httpOnly: false });
  store.set(SESSION_FLAG(id), "1", {
    path: `/p/${id}`,
    expires: c.expiresAt,
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });
  return assetUrl(id, "");
}

export default async function PrototypePage({ params }: { params: { guid: string } }) {
  const p = await getPrototype(params.guid);
  if (!p) notFound();
  if (isExpired(p)) notFound();

  const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;

  if (!p.isProtected) {
    setPrototypeCookie(p.id, expiresAt);
    redirect(assetUrl(p.id, p.entryFile));
  }

  const unlocked = cookies().get(SESSION_FLAG(p.id))?.value === "1";
  if (unlocked) {
    setPrototypeCookie(p.id, expiresAt);
    redirect(assetUrl(p.id, p.entryFile));
  }

  return <UnlockForm prototypeId={p.id} name={p.name} />;
}
