export function getWaitSeconds(created: string, now = Date.now()): number {
  const includesTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(created);
  const createdAt = Date.parse(includesTimezone ? created : `${created}Z`);

  if (Number.isNaN(createdAt)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - createdAt) / 1000));
}

export function formatWaitTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}h`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}