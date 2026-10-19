import { describe, expect, it } from "vitest";
import {
  QUESTION_BANK,
  TOTAL_QUESTIONS,
  pickQuestionIndexes,
  questionAt,
} from "../../src/questions";

describe("question bank", () => {
  it("contains at least 10 bundled Japanese questions", () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(TOTAL_QUESTIONS);
    for (const question of QUESTION_BANK) {
      expect(question.prompt.length).toBeGreaterThan(0);
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices).size).toBe(4);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThanOrEqual(3);
    }
  });

  it("has unique ids and prompts", () => {
    expect(new Set(QUESTION_BANK.map((question) => question.id)).size).toBe(
      QUESTION_BANK.length,
    );
    expect(new Set(QUESTION_BANK.map((question) => question.prompt)).size).toBe(
      QUESTION_BANK.length,
    );
  });

  it("picks 10 distinct question indexes per game", () => {
    const picked = pickQuestionIndexes(TOTAL_QUESTIONS);
    expect(picked).toHaveLength(TOTAL_QUESTIONS);
    expect(new Set(picked).size).toBe(TOTAL_QUESTIONS);
    for (const index of picked) {
      expect(questionAt(index).prompt).toBeTruthy();
    }
  });

  it("is deterministic with a supplied random source", () => {
    const random = () => 0;
    expect(pickQuestionIndexes(10, random)).toEqual(
      pickQuestionIndexes(10, random),
    );
  });
});
