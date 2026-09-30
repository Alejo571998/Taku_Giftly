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

export interface CreateGroupInput {
  giftSessionId: string;
  name: string;
  creatorId: string;
  inviteCode?: string;
}

export interface DataStore {
  createSessionWithOptions(
    input: GiftSessionInput,
    creatorId: string,
    options: GiftOption[],
    aiSource?: string | null
  ): Promise<{ session: GiftSession; options: GiftOption[] }>;
  getSessionWithOptions(
    sessionId: string
  ): Promise<{ session: GiftSession; options: GiftOption[] } | null>;
  getOption(optionId: string): Promise<GiftOption | null>;
  getOptionWithSession(
    optionId: string
  ): Promise<{ option: GiftOption; session: GiftSession } | null>;
  createGroup(input: CreateGroupInput): Promise<Group>;
  getGroupByCode(inviteCode: string): Promise<GroupBundle | null>;
  joinGroup(
    groupId: string,
    userId: string,
    displayName: string
  ): Promise<GroupParticipant>;
  upsertVote(
    groupId: string,
    giftOptionId: string,
    participantId: string,
    score: number
  ): Promise<Vote>;
  finalizeGroup(groupId: string, creatorId: string): Promise<Group>;
  setGroupWinner(groupId: string, winnerOptionId: string): Promise<Group>;
  listUserSessions(userId: string): Promise<UserSessionSummary[]>;
  getGroupBySession(sessionId: string): Promise<Group | null>;
  /** Guarda precios/ofertas recién consultados de una opción. */
  updateOptionPrices(optionId: string, product: ProductInfo): Promise<GiftOption>;
  /**
   * Pasa búsquedas, grupos y participaciones de una identidad anónima a una
   * cuenta con email (el usuario entró desde otro navegador).
   */
  reassignUser(fromUserId: string, toUserId: string): Promise<void>;
  /** Búsquedas creadas por el usuario desde una fecha (límite de uso). */
  countSessionsSince(userId: string, sinceIso: string): Promise<number>;
}

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}