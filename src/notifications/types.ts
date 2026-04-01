import { type DeployResult } from '../deploy/types';

export interface NotificationContext {
  serverId: string;
  jobId: string;
  repository: string;
  environment: string;
  tag: string;
  status: DeployResult['status'];
  durationMs: number;
  error?: string;
  rollbackTag?: string;
  triggeredBy: 'webhook' | 'admin';
}

export interface NotificationTargets {
  telegram: {
    enabled: boolean;
    botToken?: string;
    chatIds: string[];
  };
  email: {
    enabled: boolean;
    apiKey?: string;
    from?: string;
    recipients: string[];
  };
}
