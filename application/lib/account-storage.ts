export const LEGACY_STORAGE_KEY = "spr-core-state-v1";
/** Legacy guest records remain unassigned. Authenticated users never inherit them. */
export function rehearsalStorageKey(accountId: string | null): string {
  return accountId === null ? LEGACY_STORAGE_KEY : `perform-ai.account-state.v1.${encodeURIComponent(accountId)}`;
}
