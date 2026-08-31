const TALKBACK_RETRY_DELAY_MS = 750;

export function talkbackRetryDelayMs(active: boolean): number | null {
  return active ? TALKBACK_RETRY_DELAY_MS : null;
}
