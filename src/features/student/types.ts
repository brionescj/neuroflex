/**
 * Lo que devuelve GET /api/student/scores. Es copia de los tipos de
 * lib/studentScores.ts (el navegador no comparte codigo con el servidor).
 */

export type ScoreGameId = "color-sequence" | "node-connection" | "mini-cases";

export type LadderState = "first-try" | "retry" | "reached" | "pending";

export type LadderLevel = {
  level: number;
  state: LadderState;
  points: number;
  percent?: number;
};

export type AttemptBar = {
  attemptNumber: number;
  bestLevel: number;
  isRecord: boolean;
};

export type CaseBar = {
  caseKey: string;
  /** Si ya respondio este caso. Uno sin jugar esta pendiente, no en 0. */
  played: boolean;
  steps: number;
  complete: boolean;
};

export type NodeMargin = {
  level: number;
  marginPercent: number;
};

export type BadgeTier = 1 | 2 | 3 | 4 | 5;

export type Badge = {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  goal: number;
  current: number;
  earned: boolean;
};

export type RankInfo = {
  name: string;
  minPoints: number;
  next: { name: string; minPoints: number } | null;
  pointsToNext: number;
  progressPercent: number;
};

export type StudentScores = {
  hasPlayed: boolean;
  totalPoints: number;
  rank: RankInfo;
  pointsByGame: { gameId: ScoreGameId; points: number }[];
  stats: {
    levelsPassed: number;
    firstTryLevels: number;
    flawlessLevels: number;
    perfectCases: number;
    finishedAttempts: number;
  };
  colorSequence: { ladder: LadderLevel[]; bestLevel: number; attempts: AttemptBar[] };
  nodes: {
    ladder: LadderLevel[];
    bestLevel: number;
    attempts: AttemptBar[];
    margins: NodeMargin[];
  };
  miniCases: { cases: CaseBar[]; total: number; played: number };
  badges: Badge[];
  nextGoal: Badge | null;
};
