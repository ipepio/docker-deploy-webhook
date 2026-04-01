export const RedisKeys = {
  job: (id: string) => `ddw:job:${id}`,
  pending: (repository: string, environment: string) => `ddw:pending:${repository}:${environment}`,
  running: () => 'ddw:running',
  recent: (repository: string, environment: string) => `ddw:recent:${repository}:${environment}`,
  recentAll: () => 'ddw:recent:all',
  rateLimit: (scope: string, key: string, windowSlot: number) =>
    `ddw:ratelimit:${scope}:${key}:${windowSlot}`,
};
