export type Share = { memberId: number; shareMinor: number };

export function splitEqually(
  amountMinor: number,
  memberIds: number[],
): Share[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Amount must be a positive integer");
  }
  if (memberIds.length === 0) {
    throw new Error("At least one participant is required");
  }
  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error("Participants must be unique");
  }

  const sorted = [...memberIds].sort((a, b) => a - b);
  const base = Math.floor(amountMinor / sorted.length);
  const remainder = amountMinor % sorted.length;

  return sorted.map((memberId, index) => ({
    memberId,
    shareMinor: base + (index < remainder ? 1 : 0),
  }));
}
