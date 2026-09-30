import type { NextRequest } from "next/server";
import { getDataStore } from "@/lib/data";
import { generateInviteCode } from "@/lib/data/store";
import { resolveUserId, jsonError } from "@/lib/server-auth";
import { LIMITS, checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation/gift-input";

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return jsonError(401, "Necesitás una identidad anónima para continuar.");

  const [limit, windowMs] = LIMITS.groupCreatePerIp;
  const rl = checkRateLimit(`groups:${clientIp(req)}`, limit, windowMs);
  if (!rl.ok) return tooManyRequests("Creaste muchos grupos seguidos. Probá más tarde.", rl.retryAfterSeconds);

  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
    name?: string;
    displayName?: string;
  } | null;

  if (
    !body?.sessionId ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.displayName !== "string" ||
    !body.displayName.trim()
  ) {
    return jsonError(400, "Faltan datos para crear el grupo.");
  }

  try {
    const sessionData = await getDataStore().getSessionWithOptions(body.sessionId);
    if (!sessionData) return jsonError(404, "No encontramos esa búsqueda de regalos.");

    if (sessionData.session.creatorId !== userId) {
      return jsonError(403, "Solo quien creó la búsqueda puede armar el grupo.");
    }

    // Una búsqueda tiene un solo grupo: si ya existe, se reutiliza.
    const existingGroup = await getDataStore().getGroupBySession(body.sessionId);
    if (existingGroup) {
      return Response.json({ group: existingGroup, existing: true });
    }

    let inviteCode = generateInviteCode();
    while (true) {
      const existing = await getDataStore().getGroupByCode(inviteCode);
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    const group = await getDataStore().createGroup({
      giftSessionId: body.sessionId,
      name: cleanText(body.name, 80),
      creatorId: userId,
      inviteCode,
    });

    await getDataStore().joinGroup(
      group.id,
      userId,
      cleanText(body.displayName, 40)
    );

    const groupData = await getDataStore().getGroupByCode(group.inviteCode);

    return Response.json({ group, bundle: groupData });
  } catch (error) {
    console.error("[groups] Error creando grupo:", error);
    return jsonError(500, "Algo salió mal. Intentá nuevamente.");
  }
}