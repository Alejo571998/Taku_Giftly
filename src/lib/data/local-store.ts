import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  GiftOption,
  GiftSession,
  GiftSessionInput,
  Group,
  GroupBundle,
  GroupParticipant,
  ProductInfo,
  UserSessionSummary,
  Vote,
} from "@/lib/types";
import type { CreateGroupInput, DataStore } from "@/lib/data/store";
import { generateInviteCode } from "@/lib/data/store";

interface LocalDb {
  sessions: GiftSession[];
  options: GiftOption[];
  groups: Group[];
  participants: GroupParticipant[];
  votes: Vote[];
}

// GIFTLY_DATA_DIR permite aislar los datos (tests).
const DATA_DIR = process.env.GIFTLY_DATA_DIR ?? path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "giftly.json");

const emptyDb: LocalDb = {
  sessions: [],
  options: [],
  groups: [],
  participants: [],
  votes: [],
};

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readDb(): Promise<LocalDb> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    const db = { ...emptyDb, ...parsed };
    // Datos guardados antes de existir la comparación de precios
    db.options = db.options.map((o) => ({
      ...o,
      offers: o.offers ?? [],
      pricesUpdatedAt: o.pricesUpdatedAt ?? null,
    }));
    return db;
  } catch {
    return { ...emptyDb };
  }
}

async function writeDb(db: LocalDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, DB_PATH);
}

function nowIso(): string {
  return new Date().toISOString();
}

function toSessionRow(
  input: GiftSessionInput,
  creatorId: string,
  id: string,
  aiSource?: string | null
): GiftSession {
  return {
    id,
    creatorId,
    recipientName: input.recipientName?.trim() || null,
    recipientRelationship: input.recipientRelationship,
    occasion: input.occasion,
    occasionDate: input.occasionDate ?? null,
    ageRange: input.ageRange,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    interests: input.interests,
    recentHints: input.recentHints.trim() || null,
    thingsToAvoid: input.thingsToAvoid.trim() || null,
    additionalNotes: input.additionalNotes.trim() || null,
    aiSource: (aiSource as GiftSession["aiSource"]) ?? null,
    createdAt: nowIso(),
  };
}

/**
 * Store local en archivo JSON (solo desarrollo).
 * Permite que el flujo completo funcione de punta a punta sin
 * credenciales de Supabase; se reemplaza por Postgres vía env vars.
 */
export class LocalDataStore implements DataStore {
  async createSessionWithOptions(
    input: GiftSessionInput,
    creatorId: string,
    options: GiftOption[],
    aiSource?: string | null
  ): Promise<{ session: GiftSession; options: GiftOption[] }> {
    return withLock(async () => {
      const db = await readDb();
      const session = toSessionRow(input, creatorId, randomUUID(), aiSource);
      const withIds = options.map((option) => ({
        ...option,
        id: randomUUID(),
        giftSessionId: session.id,
        createdAt: nowIso(),
      }));
      db.sessions.push(session);
      db.options.push(...withIds);
      await writeDb(db);
      return { session, options: withIds };
    });
  }

  async getSessionWithOptions(
    sessionId: string
  ): Promise<{ session: GiftSession; options: GiftOption[] } | null> {
    const db = await readDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    const options = db.options
      .filter((o) => o.giftSessionId === sessionId)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    return { session, options };
  }

  async getOption(optionId: string): Promise<GiftOption | null> {
    const db = await readDb();
    return db.options.find((o) => o.id === optionId) ?? null;
  }

  async getOptionWithSession(
    optionId: string
  ): Promise<{ option: GiftOption; session: GiftSession } | null> {
    const db = await readDb();
    const option = db.options.find((o) => o.id === optionId);
    if (!option) return null;
    const session = db.sessions.find((s) => s.id === option.giftSessionId);
    if (!session) return null;
    return { option, session };
  }

  async createGroup(input: CreateGroupInput): Promise<Group> {
    return withLock(async () => {
      const db = await readDb();
      let inviteCode = input.inviteCode ?? generateInviteCode();
      while (db.groups.some((g) => g.inviteCode === inviteCode)) {
        inviteCode = generateInviteCode();
      }
      const group: Group = {
        id: randomUUID(),
        giftSessionId: input.giftSessionId,
        name: input.name,
        creatorId: input.creatorId,
        inviteCode,
        status: "active",
        winnerOptionId: null,
        createdAt: nowIso(),
      };
      db.groups.push(group);
      await writeDb(db);
      return group;
    });
  }

  async getGroupByCode(inviteCode: string): Promise<GroupBundle | null> {
    const db = await readDb();
    const group = db.groups.find(
      (g) => g.inviteCode.toLowerCase() === inviteCode.trim().toLowerCase()
    );
    if (!group) return null;

    const session = db.sessions.find((s) => s.id === group.giftSessionId) ?? null;
    const options = db.options
      .filter((o) => o.giftSessionId === group.giftSessionId)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    const participants = db.participants.filter((p) => p.groupId === group.id);
    const votes = db.votes.filter((v) => v.groupId === group.id);

    return { group, session, options, participants, votes };
  }

  async joinGroup(
    groupId: string,
    userId: string,
    displayName: string
  ): Promise<GroupParticipant> {
    return withLock(async () => {
      const db = await readDb();
      const existing = db.participants.find(
        (p) => p.groupId === groupId && p.userId === userId
      );
      if (existing) {
        existing.displayName = displayName;
        await writeDb(db);
        return existing;
      }
      const participant: GroupParticipant = {
        id: randomUUID(),
        groupId,
        userId,
        displayName,
        avatar: null,
        joinedAt: nowIso(),
      };
      db.participants.push(participant);
      await writeDb(db);
      return participant;
    });
  }

  async upsertVote(
    groupId: string,
    giftOptionId: string,
    participantId: string,
    score: number
  ): Promise<Vote> {
    return withLock(async () => {
      const db = await readDb();
      const existing = db.votes.find(
        (v) => v.giftOptionId === giftOptionId && v.participantId === participantId
      );
      if (existing) {
        existing.score = score;
        await writeDb(db);
        return existing;
      }
      const vote: Vote = {
        id: randomUUID(),
        groupId,
        giftOptionId,
        participantId,
        score,
        createdAt: nowIso(),
      };
      db.votes.push(vote);
      await writeDb(db);
      return vote;
    });
  }

  async finalizeGroup(groupId: string, creatorId: string): Promise<Group> {
    return withLock(async () => {
      const db = await readDb();
      const group = db.groups.find((g) => g.id === groupId);
      if (!group) throw new Error("Grupo no encontrado");
      if (group.creatorId !== creatorId) {
        throw new Error("Solo el creador puede finalizar la votación");
      }
      group.status = "finished";
      await writeDb(db);
      return group;
    });
  }

  async setGroupWinner(groupId: string, winnerOptionId: string): Promise<Group> {
    return withLock(async () => {
      const db = await readDb();
      const group = db.groups.find((g) => g.id === groupId);
      if (!group) throw new Error("Grupo no encontrado");
      group.winnerOptionId = winnerOptionId;
      await writeDb(db);
      return group;
    });
  }

  async listUserSessions(userId: string): Promise<UserSessionSummary[]> {
    const db = await readDb();
    const participantGroupIds = db.participants
      .filter((p) => p.userId === userId)
      .map((p) => p.groupId);
    const participantSessionIds = db.groups
      .filter((g) => participantGroupIds.includes(g.id))
      .map((g) => g.giftSessionId);
    const sessions = db.sessions
      .filter(
        (s) => s.creatorId === userId || participantSessionIds.includes(s.id)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return sessions.map((session) => {
      const optionCount = db.options.filter(
        (o) => o.giftSessionId === session.id
      ).length;
      const group =
        db.groups.find((g) => g.giftSessionId === session.id) ?? null;
      const participantCount = group
        ? db.participants.filter((p) => p.groupId === group.id).length
        : 0;
      return { session, optionCount, group, participantCount };
    });
  }

  async updateOptionPrices(optionId: string, product: ProductInfo): Promise<GiftOption> {
    return withLock(async () => {
      const db = await readDb();
      const option = db.options.find((o) => o.id === optionId);
      if (!option) throw new Error("Opción no encontrada");
      Object.assign(option, {
        estimatedPrice: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        storeName: product.storeName,
        isPriceEstimated: product.isEstimated,
        offers: product.offers,
        pricesUpdatedAt: product.pricesUpdatedAt,
      });
      await writeDb(db);
      return option;
    });
  }

  async reassignUser(fromUserId: string, toUserId: string): Promise<void> {
    return withLock(async () => {
      const db = await readDb();
      for (const s of db.sessions) if (s.creatorId === fromUserId) s.creatorId = toUserId;
      for (const g of db.groups) if (g.creatorId === fromUserId) g.creatorId = toUserId;
      const accountGroups = new Set(
        db.participants.filter((p) => p.userId === toUserId).map((p) => p.groupId)
      );
      const dropped = new Set<string>();
      for (const p of db.participants) {
        if (p.userId !== fromUserId) continue;
        if (accountGroups.has(p.groupId)) dropped.add(p.id);
        else p.userId = toUserId;
      }
      db.participants = db.participants.filter((p) => !dropped.has(p.id));
      db.votes = db.votes.filter((v) => !dropped.has(v.participantId));
      await writeDb(db);
    });
  }

  async countSessionsSince(userId: string, sinceIso: string): Promise<number> {
    const db = await readDb();
    return db.sessions.filter((s) => s.creatorId === userId && s.createdAt >= sinceIso).length;
  }

  async getGroupBySession(sessionId: string): Promise<Group | null> {
    const db = await readDb();
    return db.groups.find((g) => g.giftSessionId === sessionId) ?? null;
  }
}