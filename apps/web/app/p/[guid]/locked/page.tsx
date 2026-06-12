import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { verifyUnlockCookie } from "@/lib/prototype-session";
import { env } from "@/lib/env";
import { UnlockForm } from "../unlock-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LockedPage({ params }: { params: { guid: string } }) {
  const host = (headers().get("host") ?? "").split(":")[0]!.toLowerCase();
  if (host !== env.viewHost().toLowerCase()) notFound();

  const p = await getPrototype(params.guid);
  if (!p || isExpired(p)) notFound();

  if (!p.isProtected || verifyUnlockCookie(p.id)) {
    redirect(`/p/${p.id}`);
  }

  return <UnlockForm prototypeId={p.id} name={p.name} />;
}
