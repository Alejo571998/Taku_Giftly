import type {
  GiftOption,
  GiftSession,
  GiftSessionInput,
  Group,
  GroupBundle,
  GroupParticipant,
  ProductInfo,
  ProductOffer,
  UserSessionSummary,
  Vote,
} from "@/lib/types";
import type { CreateGroupInput, DataStore } from "@/lib/data/store";
import { generateInviteCode } from "@/lib/data/store";
import { getServiceClient } from "@/lib/supabase";

interface SessionRow {
  id: string;
  creator_id: string;
  recipient_name: string | null;
  recipient_relationship: string | null;
  occasion: string | null;
  occasion_date: string | null;
  age_range: string | null;
  budget_min: number | null;
  budget_max: number | null;
  interests: string[];
  recent_hints: string | null;
  things_to_avoid: string | null;
  additional_notes: string | null;
  ai_source: string | null;
  created_at: string;
}

interface OptionRow {
  id: string;
  gift_session_id: string;
  name: string;
  category: string;
  description: string;
  why_it_fits: string;
  compatibility_score: number;
  estimated_price: number | null;
  currency: string;
  image_url: string | null;
  is_price_estimated: boolean;
  product_url: string | null;
  store_name: string | null;
  pros: string[];
  cons: string[];
  gift_type: string;
  offers: ProductOffer[] | null;
  prices_updated_at: string | null;
  created_at: string;
}

interface GroupRow {
  id: string;
  gift_session_id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  status: "active" | "finished";
  winner_option_id: string | null;
  created_at: string;
}

interface ParticipantRow {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  avatar: string | null;
  joined_at: string;
}

interface VoteRow {
  id: string;
  group_id: string;
  gift_option_id: string;
  participant_id: string;
  score: number;
  created_at: string;
}

function mapSession(row: SessionRow): GiftSession {
  return {
    id: row.id,
    creatorId: row.creator_id,
    recipientName: row.recipient_name,
    recipientRelationship: row.recipient_relationship,
    occasion: row.occasion,
    occasionDate: row.occasion_date,
    ageRange: row.age_range,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    interests: row.interests ?? [],
    recentHints: row.recent_hints,
    thingsToAvoid: row.things_to_avoid,
    additionalNotes: row.additional_notes,
    aiSource: (row.ai_source as GiftSession["aiSource"]) ?? null,
    createdAt: row.created_at,
  };
}

function mapOption(row: OptionRow): GiftOption {
  return {
    id: row.id,
    giftSessionId: row.gift_session_id,
    name: row.name,
    category: row.category,
    description: row.description,
    whyItFits: row.why_it_fits,
    compatibilityScore: row.compatibility_score,
    estimatedPrice: row.estimated_price,
    currency: row.currency,
    imageUrl: row.image_url,
    isPriceEstimated: row.is_price_estimated,
    productUrl: row.product_url,
    storeName: row.store_name,
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    giftType: row.gift_type as GiftOption["giftType"],
    offers: row.offers ?? [],
    pricesUpdatedAt: row.prices_updated_at ?? null,
    createdAt: row.created_at,
  };
}

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    giftSessionId: row.gift_session_id,
    name: row.name,
    creatorId: row.creator_id,
    inviteCode: row.invite_code,
    status: row.status,
    winnerOptionId: row.winner_option_id ?? null,
    createdAt: row.created_at,
  };
}

function mapParticipant(row: ParticipantRow): GroupParticipant {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatar: row.avatar,
    joinedAt: row.joined_at,
  };
}

function mapVote(row: VoteRow): Vote {
  return {
    id: row.id,
    groupId: row.group_id,
    giftOptionId: row.gift_option_id,
    participantId: row.participant_id,
    score: row.score,
    createdAt: row.created_at,
  };
}

function throwIfNoClient(): NonNullable<ReturnType<typeof getServiceClient>> {
  const client = getServiceClient();
  if (!client) throw new Error("Supabase no está configurado");
  return client;
}

function toOptionRow(
  option: Omit<GiftOption, "id" | "createdAt">,
  sessionId: string
): Omit<OptionRow, "id" | "created_at"> {
  return {
    gift_session_id: sessionId,
    name: option.name,
    category: option.category,
    description: option.description,
    why_it_fits: option.whyItFits,
    compatibility_score: option.compatibilityScore,
    estimated_price: option.estimatedPrice,
    currency: option.currency,
    image_url: option.imageUrl,
    is_price_estimated: option.isPriceEstimated,
    product_url: option.productUrl,
    store_name: option.storeName,
    pros: option.pros,
    cons: option.cons,
    gift_type: option.giftType,
    offers: option.offers,
    prices_updated_at: option.pricesUpdatedAt,
  };
}

function toSessionRow(
  input: GiftSessionInput,
  creatorId: string,
  aiSource?: string | null
): Omit<SessionRow, "id" | "created_at"> {
  const row: Omit<SessionRow, "id" | "created_at"> = {
    creator_id: creatorId,
    recipient_name: input.recipientName?.trim() || null,
    recipient_relationship: input.recipientRelationship,
    occasion: input.occasion,
    occasion_date: input.occasionDate ?? null,
    age_range: input.ageRange,
    budget_min: input.budgetMin,
    budget_max: input.budgetMax,
    interests: input.interests,
    recent_hints: input.recentHints.trim() || null,
    things_to_avoid: input.thingsToAvoid.trim() || null,
    additional_notes: input.additionalNotes.trim() || null,
    ai_source: aiSource ?? null,
  };
  return row;
}

function toSessionRowWithoutAI(
  input: GiftSessionInput,
  creatorId: string
): Omit<SessionRow, "id" | "created_at" | "ai_source"> {
  return {
    creator_id: creatorId,
    recipient_name: input.recipientName?.trim() || null,
    recipient_relationship: input.recipientRelationship,
    occasion: input.occasion,
    occasion_date: input.occasionDate ?? null,
    age_range: input.ageRange,
    budget_min: input.budgetMin,
    budget_max: input.budgetMax,
    interests: input.interests,
    recent_hints: input.recentHints.trim() || null,
    things_to_avoid: input.thingsToAvoid.trim() || null,
    additional_notes: input.additionalNotes.trim() || null,
  } as Omit<SessionRow, "id" | "created_at" | "ai_source">;
}

/**
 * Store sobre Supabase (Postgres + RLS + Realtime).
 * Usa el cliente con service role desde el servidor; el navegador
 * solo accede vía API routes o Realtime con su sesión anónima.
 */
export class SupabaseDataStore implements DataStore {
  async createSessionWithOptions(
    input: GiftSessionInput,
    creatorId: string,
    options: GiftOption[],
    aiSource?: string | null
  ): Promise<{ session: GiftSession; options: GiftOption[] }> {
    const client = throwIfNoClient();

    let sessionRow: SessionRow | null = null;
    let sessionError: { message: string } | null = null;
    // Intento con ai_source; si la columna aún no existe en la DB viva, reintentar sin ella
    {
      const { data, error } = await client
        .from("gift_sessions")
        .insert(toSessionRow(input, creatorId, aiSource))
        .select("*")
        .single();
      sessionRow = data as SessionRow | null;
      sessionError = error as { message: string } | null;
      if (sessionError?.message?.includes("ai_source")) {
        const retry = await client
          .from("gift_sessions")
          .insert(toSessionRowWithoutAI(input, creatorId))
          .select("*")
          .single();
        sessionRow = retry.data as SessionRow | null;
        sessionError = retry.error as { message: string } | null;
        if (!sessionError && sessionRow) {
          (sessionRow as SessionRow & { ai_source?: string | null }).ai_source = aiSource ?? null;
        }
      }
    }

    if (sessionError || !sessionRow) {
      throw new Error(`No se pudo crear la sesión: ${sessionError?.message}`);
    }

    const { data: optionRows, error: optionError } = await client
      .from("gift_options")
      .insert(options.map((o) => toOptionRow(o, sessionRow.id)))
      .select("*");

    if (optionError) {
      throw new Error(`No se pudieron guardar las opciones: ${optionError.message}`);
    }

    return {
      session: mapSession(sessionRow as SessionRow),
      options: (optionRows ?? []).map((r) => mapOption(r as OptionRow)),
    };
  }

  async getSessionWithOptions(
    sessionId: string
  ): Promise<{ session: GiftSession; options: GiftOption[] } | null> {
    const client = throwIfNoClient();

    const { data: sessionRow, error: sessionError } = await client
      .from("gift_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionRow) return null;

    const { data: optionRows, error: optionError } = await client
      .from("gift_options")
      .select("*")
      .eq("gift_session_id", sessionId)
      .order("compatibility_score", { ascending: false });

    if (optionError) throw new Error(optionError.message);

    return {
      session: mapSession(sessionRow as SessionRow),
      options: (optionRows ?? []).map((r) => mapOption(r as OptionRow)),
    };
  }

  async getOption(optionId: string): Promise<GiftOption | null> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("gift_options")
      .select("*")
      .eq("id", optionId)
      .single();
    if (error || !data) return null;
    return mapOption(data as OptionRow);
  }

  async getOptionWithSession(
    optionId: string
  ): Promise<{ option: GiftOption; session: GiftSession } | null> {
    const client = throwIfNoClient();

    const { data: optionRow, error: optionError } = await client
      .from("gift_options")
      .select("*")
      .eq("id", optionId)
      .single();

    if (optionError || !optionRow) return null;

    const { data: sessionRow, error: sessionError } = await client
      .from("gift_sessions")
      .select("*")
      .eq("id", (optionRow as OptionRow).gift_session_id)
      .single();

    if (sessionError || !sessionRow) return null;

    return {
      option: mapOption(optionRow as OptionRow),
      session: mapSession(sessionRow as SessionRow),
    };
  }

  async createGroup(input: CreateGroupInput): Promise<Group> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("groups")
      .insert({
        gift_session_id: input.giftSessionId,
        name: input.name,
        creator_id: input.creatorId,
        invite_code: input.inviteCode ?? generateInviteCode(),
        status: "active",
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el grupo: ${error?.message}`);
    }
    return mapGroup(data as GroupRow);
  }

  async getGroupByCode(inviteCode: string): Promise<GroupBundle | null> {
    const client = throwIfNoClient();

    const { data: groupRow, error: groupError } = await client
      .from("groups")
      .select("*")
      .ilike("invite_code", inviteCode.trim())
      .single();

    if (groupError || !groupRow) return null;
    const group = mapGroup(groupRow as GroupRow);

    const { data: sessionRow } = await client
      .from("gift_sessions")
      .select("*")
      .eq("id", group.giftSessionId)
      .single();

    const { data: optionRows, error: optionError } = await client
      .from("gift_options")
      .select("*")
      .eq("gift_session_id", group.giftSessionId)
      .order("compatibility_score", { ascending: false });

    const { data: participantRows } = await client
      .from("group_participants")
      .select("*")
      .eq("group_id", group.id);

    const { data: voteRows } = await client
      .from("votes")
      .select("*")
      .eq("group_id", group.id);

    if (optionError) throw new Error(optionError.message);

    return {
      group,
      session: sessionRow ? mapSession(sessionRow as SessionRow) : null,
      options: (optionRows ?? []).map((r) => mapOption(r as OptionRow)),
      participants: (participantRows ?? []).map((r) =>
        mapParticipant(r as ParticipantRow)
      ),
      votes: (voteRows ?? []).map((r) => mapVote(r as VoteRow)),
    };
  }

  async joinGroup(
    groupId: string,
    userId: string,
    displayName: string
  ): Promise<GroupParticipant> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("group_participants")
      .upsert(
        {
          group_id: groupId,
          user_id: userId,
          display_name: displayName,
        },
        { onConflict: "group_id,user_id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo unir al grupo: ${error?.message}`);
    }
    return mapParticipant(data as ParticipantRow);
  }

  async upsertVote(
    groupId: string,
    giftOptionId: string,
    participantId: string,
    score: number
  ): Promise<Vote> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("votes")
      .upsert(
        {
          group_id: groupId,
          gift_option_id: giftOptionId,
          participant_id: participantId,
          score,
        },
        { onConflict: "gift_option_id,participant_id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo registrar el voto: ${error?.message}`);
    }
    return mapVote(data as VoteRow);
  }

  async finalizeGroup(groupId: string, creatorId: string): Promise<Group> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("groups")
      .update({ status: "finished" })
      .eq("id", groupId)
      .eq("creator_id", creatorId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo finalizar la votación: ${error?.message}`);
    }
    return mapGroup(data as GroupRow);
  }

  async setGroupWinner(groupId: string, winnerOptionId: string): Promise<Group> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("groups")
      .update({ winner_option_id: winnerOptionId })
      .eq("id", groupId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`No se pudo guardar el ganador: ${error?.message}`);
    }
    return mapGroup(data as GroupRow);
  }

  async listUserSessions(userId: string): Promise<UserSessionSummary[]> {
    const client = throwIfNoClient();

    const { data: sessionRows, error: sessionError } = await client
      .from("gift_sessions")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (sessionError) return [];
    const sessions = (sessionRows ?? []).map((r) => mapSession(r as SessionRow));

    const { data: participantRows } = await client
      .from("group_participants")
      .select("group_id")
      .eq("user_id", userId);

    let memberGroupIds: string[] = [];
    if (participantRows && participantRows.length > 0) {
      memberGroupIds = participantRows.map((r) =>
        String((r as { group_id: string }).group_id)
      );
      const { data: memberGroupRows } = await client
        .from("groups")
        .select("gift_session_id")
        .in("id", memberGroupIds);
      const memberSessionIds = (memberGroupRows ?? []).map((r) =>
        String((r as { gift_session_id: string }).gift_session_id)
      );
      const memberIds = memberSessionIds.filter(
        (id) => !sessions.some((s) => s.id === id)
      );
      if (memberIds.length > 0) {
        const { data: memberSessionRows } = await client
          .from("gift_sessions")
          .select("*")
          .in("id", memberIds);
        for (const row of memberSessionRows ?? []) {
          sessions.push(mapSession(row as SessionRow));
        }
      }
    }

    const sessionIds = sessions.map((s) => s.id);

    const { data: optionRows } = await client
      .from("gift_options")
      .select("gift_session_id")
      .in("gift_session_id", sessionIds);

    const { data: groupRows } = await client
      .from("groups")
      .select("*")
      .in("gift_session_id", sessionIds);

    const optionCounts = new Map<string, number>();
    for (const row of optionRows ?? []) {
      const key = (row as { gift_session_id: string }).gift_session_id;
      optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
    }

    const groupsBySession = new Map<string, Group>();
    for (const row of groupRows ?? []) {
      const group = mapGroup(row as GroupRow);
      groupsBySession.set(group.giftSessionId, group);
    }

    let participantCounts = new Map<string, number>();
    if (groupRows && groupRows.length > 0) {
      const { data: participantRows } = await client
        .from("group_participants")
        .select("group_id")
        .in(
          "group_id",
          (groupRows ?? []).map((r) => (r as GroupRow).id)
        );

      participantCounts = new Map<string, number>();
      for (const row of participantRows ?? []) {
        const key = (row as { group_id: string }).group_id;
        participantCounts.set(key, (participantCounts.get(key) ?? 0) + 1);
      }
    }

    return sessions.map((session) => ({
      session,
      optionCount: optionCounts.get(session.id) ?? 0,
      group: groupsBySession.get(session.id) ?? null,
      participantCount: participantCounts.get(
        groupsBySession.get(session.id)?.id ?? ""
      ) ?? 0,
    }));
  }

  async updateOptionPrices(optionId: string, product: ProductInfo): Promise<GiftOption> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("gift_options")
      .update({
        estimated_price: product.price,
        currency: product.currency,
        image_url: product.imageUrl,
        product_url: product.productUrl,
        store_name: product.storeName,
        is_price_estimated: product.isEstimated,
        offers: product.offers,
        prices_updated_at: product.pricesUpdatedAt,
      })
      .eq("id", optionId)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(`No se pudieron actualizar los precios: ${error?.message}`);
    }
    return mapOption(data as OptionRow);
  }

  async reassignUser(fromUserId: string, toUserId: string): Promise<void> {
    const client = throwIfNoClient();
    const steps = [
      client.from("gift_sessions").update({ creator_id: toUserId }).eq("creator_id", fromUserId),
      client.from("groups").update({ creator_id: toUserId }).eq("creator_id", fromUserId),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) throw new Error(`No se pudo pasar la cuenta: ${error.message}`);
    }

    // Participaciones: si la cuenta ya estaba en ese grupo, se conserva la
    // de la cuenta (y sus votos); si no, la anónima pasa a la cuenta.
    const { data: rows } = await client
      .from("group_participants")
      .select("id, group_id, user_id")
      .in("user_id", [fromUserId, toUserId]);
    const accountGroups = new Set(
      (rows ?? []).filter((r) => r.user_id === toUserId).map((r) => r.group_id as string)
    );
    for (const row of (rows ?? []).filter((r) => r.user_id === fromUserId)) {
      const query = accountGroups.has(row.group_id as string)
        ? client.from("group_participants").delete().eq("id", row.id)
        : client.from("group_participants").update({ user_id: toUserId }).eq("id", row.id);
      const { error } = await query;
      if (error) throw new Error(`No se pudo pasar la cuenta: ${error.message}`);
    }
  }

  async countSessionsSince(userId: string, sinceIso: string): Promise<number> {
    const client = throwIfNoClient();
    const { count, error } = await client
      .from("gift_sessions")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .gte("created_at", sinceIso);
    if (error) throw new Error(`No se pudo verificar el límite: ${error.message}`);
    return count ?? 0;
  }

  async getGroupBySession(sessionId: string): Promise<Group | null> {
    const client = throwIfNoClient();
    const { data, error } = await client
      .from("groups")
      .select("*")
      .eq("gift_session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapGroup(data as GroupRow);
  }
}