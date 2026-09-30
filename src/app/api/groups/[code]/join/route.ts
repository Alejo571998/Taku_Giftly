import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { resolveUserId, jsonError } from "@/lib/server-auth";
import { LIMITS, checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation/gift-input";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/groups/[code]/join">
) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const { code } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    displayName?: string;
  } | null;

  const [limit, windowMs] = LIMITS.groupActionPerIp;
  const rl = checkRateLimit(`group-action:${clientIp(req)}`, limit, windowMs);
  if (!rl.ok) return tooManyRequests("Vas muy rápido. Esperá unos segundos.", rl.retryAfterSeconds);

  const displayName = cleanText(body?.displayName, 60);
  if (!displayName || displayName.length < 2 || displayName.length > 40) {
    return jsonError(400, "Contanos tu nombre (entre 2 y 40 caracteres).");
  }

  const bundle = await getDataStore().getGroupByCode(code);
  if (!bundle) return jsonError(404, "No encontramos ese grupo. Revisá el código.");

  if (bundle.group.status === "finished") {
    return jsonError(400, "La votación de este grupo ya finalizó.");
  }

  try {
    const participant = await getDataStore().joinGroup(
      bundle.group.id,
      userId,
      displayName
    );
    return Response.json({ participant });
  } catch (error) {
    console.error("[join] Error:", error);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}