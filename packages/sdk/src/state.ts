import { STORAGE_KEYS } from "./constants";
import { getHost, hasDom } from "./config";

export type PersistedOpenStateType = "popup" | "slider" | "float";

type PersistedOpenState = {
  v: 1;
  open: boolean;
};

type PersistedOpenStateKey = {
  researchId: string;
  type: PersistedOpenStateType;
  host?: string;
};

function getPersistedOpenStateKey({
  researchId,
  type,
  host,
}: PersistedOpenStateKey): string {
  return `${STORAGE_KEYS.embedState}:${getHost(host)}:${type}:${researchId}`;
}

export function getPersistedOpenState(
  key: PersistedOpenStateKey
): boolean | null {
  if (!hasDom()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(getPersistedOpenStateKey(key));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedOpenState>;
    return typeof parsed.open === "boolean" ? parsed.open : null;
  } catch {
    return null;
  }
}

export function setPersistedOpenState(
  key: PersistedOpenStateKey & { open: boolean }
): void {
  if (!hasDom()) {
    return;
  }

  try {
    const value: PersistedOpenState = { v: 1, open: key.open };
    sessionStorage.setItem(
      getPersistedOpenStateKey(key),
      JSON.stringify(value)
    );
  } catch {
    // Storage can be unavailable in some browser/privacy modes.
  }
}

type TeaserDismissedState = {
  v: 1;
  dismissed: boolean;
};

type TeaserDismissedKey = {
  researchId: string;
  host?: string;
};

function getTeaserDismissedKey({ researchId, host }: TeaserDismissedKey) {
  return `${STORAGE_KEYS.teaserDismissed}:${getHost(host)}:${researchId}`;
}

/** Whether the user dismissed the float teaser this browser session. */
export function getPersistedTeaserDismissed(key: TeaserDismissedKey): boolean {
  if (!hasDom()) {
    return false;
  }

  try {
    const raw = sessionStorage.getItem(getTeaserDismissedKey(key));
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as Partial<TeaserDismissedState>;
    return parsed.dismissed === true;
  } catch {
    return false;
  }
}

export function setPersistedTeaserDismissed(key: TeaserDismissedKey): void {
  if (!hasDom()) {
    return;
  }

  try {
    const value: TeaserDismissedState = { v: 1, dismissed: true };
    sessionStorage.setItem(getTeaserDismissedKey(key), JSON.stringify(value));
  } catch {
    // Storage can be unavailable in some browser/privacy modes.
  }
}
