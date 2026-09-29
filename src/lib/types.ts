export type RelationshipKey =
  | "pareja"
  | "madre"
  | "padre"
  | "hijo"
  | "hermano"
  | "amigo"
  | "companiero"
  | "otro";

export type AgeRange =
  | "menor18"
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-64"
  | "65+";

export interface GiftSessionInput {
  recipientName?: string;
  recipientRelationship: string;
  occasion: string;
  occasionDate?: string | null;
  ageRange: string;
  budgetMin: number;
  budgetMax: number | null;
  interests: string[];
  recentHints: string;
  thingsToAvoid: string;
  additionalNotes: string;
}

export type BudgetFit = "within" | "over" | "under";

export type GiftType = "physical" | "experience" | "giftcard" | "service";

export interface GiftCandidate {
  name: string;
  category: string;
  description: string;
  whyItFits: string;
  tags: string[];
  estimatedPrice: number;
  giftType: GiftType;
  pros: string[];
  cons: string[];
  matchesHint: boolean;
  budgetFit: BudgetFit;
}

export interface GiftOption {
  id: string;
  giftSessionId: string;
  name: string;
  category: string;
  description: string;
  whyItFits: string;
  compatibilityScore: number;
  estimatedPrice: number | null;
  currency: string;
  imageUrl: string | null;
  isPriceEstimated: boolean;
  productUrl: string | null;
  storeName: string | null;
  pros: string[];
  cons: string[];
  giftType: GiftType;
  createdAt: string;
}

export type AISource = "openai" | "mock";

export interface GiftSession {
  id: string;
  creatorId: string;
  recipientName: string | null;
  recipientRelationship: string | null;
  occasion: string | null;
  occasionDate: string | null;
  ageRange: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  interests: string[];
  recentHints: string | null;
  thingsToAvoid: string | null;
  additionalNotes: string | null;
  aiSource?: AISource | null;
  createdAt: string;
  options?: GiftOption[];
}

export interface Group {
  id: string;
  giftSessionId: string;
  name: string;
  creatorId: string;
  inviteCode: string;
  status: "active" | "finished";
  winnerOptionId: string | null;
  createdAt: string;
}

export interface GroupParticipant {
  id: string;
  groupId: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  joinedAt: string;
}

export interface Vote {
  id: string;
  groupId: string;
  giftOptionId: string;
  participantId: string;
  score: number;
  createdAt: string;
}

export interface GroupBundle {
  group: Group;
  session: GiftSession | null;
  options: GiftOption[];
  participants: GroupParticipant[];
  votes: Vote[];
}

export interface UserSessionSummary {
  session: GiftSession;
  optionCount: number;
  group: Group | null;
  participantCount: number;
}

export interface ProductInfo {
  price: number;
  currency: string;
  imageUrl: string | null;
  productUrl: string | null;
  storeName: string | null;
  isEstimated: boolean;
}

export interface CandidateWithProduct extends GiftCandidate {
  product: ProductInfo;
  compatibilityScore: number;
}

export interface GroupStats {
  winner: GiftOption | null;
  isFinished: boolean;
}