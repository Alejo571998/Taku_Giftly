import type { GiftOption, GroupParticipant, Vote } from "@/lib/types";

export interface RankedOption {
  optionId: string;
  average: number;
  count: number;
}

const EPSILON = 0.001;

/**
 * Ranking del grupo. Lo usan el servidor (para cerrar la votación) y la UI
 * (ranking en vivo), así ambos muestran siempre el mismo orden.
 * Orden: promedio → cantidad de votos → compatibilidad de la IA.
 */
export function computeGroupRanking(
  options: GiftOption[],
  votes: Vote[]
): RankedOption[] {
  const compat = new Map(options.map((o) => [o.id, o.compatibilityScore]));
  return options
    .map((option) => {
      const optionVotes = votes.filter((v) => v.giftOptionId === option.id);
      const average =
        optionVotes.length > 0
          ? optionVotes.reduce((sum, v) => sum + v.score, 0) / optionVotes.length
          : 0;
      return { optionId: option.id, average, count: optionVotes.length };
    })
    .sort((a, b) => {
      if (Math.abs(b.average - a.average) > EPSILON) return b.average - a.average;
      if (b.count !== a.count) return b.count - a.count;
      return (compat.get(b.optionId) ?? 0) - (compat.get(a.optionId) ?? 0);
    });
}

/**
 * Opciones empatadas en el primer puesto (mismo promedio). Si hay una sola,
 * no hay empate. Un empate lo desempata quien creó el grupo.
 */
export function findTopTie(ranking: RankedOption[]): string[] {
  const top = ranking[0];
  if (!top || top.count === 0) return [];
  const tied = ranking.filter(
    (r) => r.count > 0 && Math.abs(r.average - top.average) <= EPSILON
  );
  return tied.length > 1 ? tied.map((r) => r.optionId) : [];
}

/** Participantes que ya puntuaron todas las opciones. */
export function countParticipantsDone(
  participants: GroupParticipant[],
  votes: Vote[],
  optionCount: number
): number {
  if (optionCount === 0) return 0;
  return participants.filter(
    (p) => votes.filter((v) => v.participantId === p.id).length >= optionCount
  ).length;
}
