export type Limits = {
  maxMembersPerGroup: number;
  maxExpensesPerGroup: number;
  maxSettlementsPerGroup: number;
  maxGroups: number;
  maxNameLength: number;
  maxNoteLength: number;
};

export const DEFAULT_LIMITS: Limits = {
  maxMembersPerGroup: 50,
  maxExpensesPerGroup: 2000,
  maxSettlementsPerGroup: 1000,
  maxGroups: 2000,
  maxNameLength: 80,
  maxNoteLength: 200,
};
