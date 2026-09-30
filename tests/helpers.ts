import type { GiftCandidate, GiftOption, GiftSessionInput, GroupParticipant, Vote } from "@/lib/types";

export function makeInput(overrides: Partial<GiftSessionInput> = {}): GiftSessionInput {
  return {
    recipientName: "",
    recipientRelationship: "padre",
    occasion: "cumpleanos",
    occasionDate: null,
    ageRange: "55-64",
    budgetMin: 100_000,
    budgetMax: 200_000,
    interests: ["cocina"],
    recentHints: "",
    thingsToAvoid: "",
    additionalNotes: "",
    ...overrides,
  };
}

export function makeCandidate(overrides: Partial<GiftCandidate> = {}): GiftCandidate {
  return {
    name: "Kit parrillero",
    category: "cocina",
    description: "Set de herramientas",
    whyItFits: "Le gusta cocinar",
    tags: ["cocina"],
    estimatedPrice: 150_000,
    giftType: "physical",
    pros: [],
    cons: [],
    matchesHint: false,
    budgetFit: "within",
    ...overrides,
  };
}

export function makeOption(id: string, compatibilityScore = 70): GiftOption {
  return {
    id,
    giftSessionId: "s1",
    name: `Opción ${id}`,
    category: "otros",
    description: "",
    whyItFits: "",
    compatibilityScore,
    estimatedPrice: 100_000,
    currency: "ARS",
    imageUrl: null,
    isPriceEstimated: true,
    productUrl: null,
    storeName: null,
    pros: [],
    cons: [],
    giftType: "physical",
    offers: [],
    pricesUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

export function vote(participantId: string, giftOptionId: string, score: number): Vote {
  return {
    id: `${participantId}-${giftOptionId}`,
    groupId: "g1",
    giftOptionId,
    participantId,
    score,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

export function participant(id: string): GroupParticipant {
  return { id, groupId: "g1", userId: `u-${id}`, displayName: id, avatar: null, joinedAt: "" };
}
