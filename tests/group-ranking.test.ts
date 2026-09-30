import { describe, expect, it } from "vitest";
import {
  computeGroupRanking,
  countParticipantsDone,
  findTopTie,
} from "@/lib/group-ranking";
import { makeOption, participant, vote } from "./helpers";

const options = [makeOption("a", 90), makeOption("b", 80), makeOption("c", 70)];

describe("computeGroupRanking", () => {
  it("ordena por promedio de votos", () => {
    const ranking = computeGroupRanking(options, [
      vote("p1", "a", 3),
      vote("p1", "b", 5),
      vote("p1", "c", 4),
    ]);
    expect(ranking.map((r) => r.optionId)).toEqual(["b", "c", "a"]);
  });

  it("sin votos, desempata por compatibilidad de la IA", () => {
    const ranking = computeGroupRanking([makeOption("x", 50), makeOption("y", 95)], []);
    expect(ranking[0].optionId).toBe("y");
  });

  it("a igual promedio gana la opción con más votos", () => {
    const ranking = computeGroupRanking(options, [
      vote("p1", "a", 5),
      vote("p1", "b", 5),
      vote("p2", "b", 5),
    ]);
    expect(ranking[0].optionId).toBe("b");
  });
});

describe("findTopTie", () => {
  it("detecta empate en el primer puesto", () => {
    const ranking = computeGroupRanking(options, [vote("p1", "a", 5), vote("p2", "b", 5)]);
    expect(findTopTie(ranking).sort()).toEqual(["a", "b"]);
  });

  it("no hay empate con un ganador claro", () => {
    const ranking = computeGroupRanking(options, [vote("p1", "a", 5), vote("p2", "b", 4)]);
    expect(findTopTie(ranking)).toEqual([]);
  });

  it("no hay empate si nadie votó", () => {
    expect(findTopTie(computeGroupRanking(options, []))).toEqual([]);
  });
});

describe("countParticipantsDone", () => {
  it("cuenta solo a quienes puntuaron todas las opciones", () => {
    const people = [participant("p1"), participant("p2")];
    const votes = [vote("p1", "a", 5), vote("p1", "b", 4), vote("p1", "c", 3), vote("p2", "a", 5)];
    expect(countParticipantsDone(people, votes, options.length)).toBe(1);
  });
});
