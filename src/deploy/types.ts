import { type DeployDefaults } from '../config/schema';

export interface ResolvedHealthcheck {
  enabled: boolean;
  url?: string;
  timeoutMs: number;
  intervalMs: number;
}

export type ResolvedTimeouts = DeployDefaults;

export interface DeployContext {
  jobId: string;
  repository: string;
  environment: string;
  tag: string;
  imageName: string;
  composeFile: string;
  runtimeEnvFile: string;
  services: string[];
  timeouts: ResolvedTimeouts;
  healthcheck: ResolvedHealthcheck;
}

export interface DeployResult {
  status: 'success' | 'failed' | 'rolled_back' | 'rollback_failed';
  durationMs: number;
  error?: string;
  rollbackTag?: string;
  logs: string[];
}

export interface RollbackState {
  successfulTag: string | null;
  previousTag: string | null;
  deployedAt: string | null;
  jobId: string | null;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
