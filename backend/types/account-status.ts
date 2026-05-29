export enum AccountStatus {
  GOOD = "good",
  SUSPENDED = "suspended",
  BANNED = "banned",
}

export function isRestrictedStanding(
  standing: string | undefined | null,
): boolean {
  return standing === AccountStatus.SUSPENDED || standing === AccountStatus.BANNED;
}
