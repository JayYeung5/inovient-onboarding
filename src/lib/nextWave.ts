import { QUESTIONS } from "./onboardingQuestions";

export function getNextWave(answers: Record<string, any>) {

  const nextQuestions = new Set<string>();

  Object.entries(answers).forEach(([qid, answer]) => {

    const q = QUESTIONS[qid];

    if (!q || !q.next) return;

    // Case 1: next is an array
    if (Array.isArray(q.next)) {
      q.next.forEach((n: string) => nextQuestions.add(n));
    }

    // Case 2: next depends on answer
    else if (typeof q.next === "object") {
      const branch = q.next[String(answer)];
      branch?.forEach((n: string) => nextQuestions.add(n));
    }

  });

  return Array.from(nextQuestions);
}