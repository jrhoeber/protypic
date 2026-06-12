import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { setUnlockCookie, verifyUnlockCookie } from "@/lib/prototype-session";
import { env } from "@/lib/env";
import { UnlockForm } from "./unlock-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertViewHost() {
  const host = (headers().get("host") ?? "").split(":")[0]!.toLowerCase();
  if (host !== env.viewHost().toLowerCase()) notFound();
}

export default async function PrototypePage({ params }: { params: { guid: string } }) {
  assertViewHost();

  const p = await getPrototype(params.guid);
  if (!p) notFound();
  if (isExpired(p)) notFound();

  const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;

  if (!p.isProtected) {
    setUnlockCookie(p.id, expiresAt);
    redirect(`/p/${p.id}/${p.entryFile}`);
  }

  if (verifyUnlockCookie(p.id)) {
    setUnlockCookie(p.id, expiresAt);
    redirect(`/p/${p.id}/${p.entryFile}`);
  }

  return <UnlockForm prototypeId={p.id} name={p.name} />;
}
