export const MIN_SEQUENCE_LENGTH = 2;
export const MAX_SEQUENCE_LENGTH = 11;
export const TOTAL_LEVELS = MAX_SEQUENCE_LENGTH - MIN_SEQUENCE_LENGTH + 1;

export type LevelResult = {
  level: number;
  sequenceLength: number;
  correctCount: number;
  timeMs: number;
};
