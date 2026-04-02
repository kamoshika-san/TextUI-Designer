export function formatRelativeUpdateTimestamp(deltaMs: number): string {
  if (deltaMs < 1000) {
    return `${Math.max(0, Math.round(deltaMs))} ms ago`;
  }

  if (deltaMs < 60_000) {
    return `${Math.max(1, Math.round(deltaMs / 1000))}s ago`;
  }

  return `${Math.max(1, Math.round(deltaMs / 60_000))}m ago`;
}
