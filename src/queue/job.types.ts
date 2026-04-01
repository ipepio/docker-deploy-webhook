export type JobStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'rolled_back'
  | 'rollback_failed'
  | 'cancelled';

export interface DeployJobPayload {
  repository: string;
  environment: string;
  tag: string;
  sha: string;
  workflow: string;
  refName: string;
  runId: number;
  triggeredBy: 'webhook' | 'admin';
  force: boolean;
}

export interface DeployJob {
  id: string;
  payload: DeployJobPayload;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  rollbackTag?: string;
  logs: string[];
}

export interface EnqueueResult {
  status: 'enqueued' | 'ignored_duplicate' | 'replaced_pending';
  jobId: string;
}
