import { z } from 'zod';

import { type RepoConfig } from '../../config/schema';
import { HttpError } from '../../errors/http-error';

export const DeployPayloadSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  environment: z.string().trim().min(1).max(100),
  tag: z.string().trim().min(1).max(200),
  sha: z.string().trim().min(1).max(200),
  workflow: z.string().trim().min(1).max(200),
  ref_name: z.string().trim().min(1).max(200),
  run_id: z.number().int().positive(),
});

export const AdminDeployPayloadSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  environment: z.string().trim().min(1).max(100),
  tag: z.string().trim().min(1).max(200),
  force: z.boolean().optional().default(false),
});

export const AdminRedeployPayloadSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  environment: z.string().trim().min(1).max(100),
  force: z.boolean().optional().default(false),
});

export function validateDeployAgainstConfig(
  payload: z.infer<typeof DeployPayloadSchema>,
  repoConfig: RepoConfig,
): void {
  const environmentConfig = repoConfig.environments[payload.environment];
  if (!environmentConfig) {
    throw new HttpError(403, 'forbidden', 'Environment is not allowed');
  }

  if (!environmentConfig.allowedWorkflows.includes(payload.workflow)) {
    throw new HttpError(403, 'forbidden', 'Workflow is not allowed');
  }

  if (!environmentConfig.allowedBranches.includes(payload.ref_name)) {
    throw new HttpError(403, 'forbidden', 'Branch is not allowed');
  }

  const tagPattern = new RegExp(environmentConfig.allowedTagPattern);
  if (!tagPattern.test(payload.tag)) {
    throw new HttpError(403, 'forbidden', 'Tag is not allowed');
  }
}

export function validateManualDeployAgainstConfig(
  payload: z.infer<typeof AdminDeployPayloadSchema>,
  repoConfig: RepoConfig,
): void {
  const environmentConfig = repoConfig.environments[payload.environment];
  if (!environmentConfig) {
    throw new HttpError(403, 'forbidden', 'Environment is not allowed');
  }

  const tagPattern = new RegExp(environmentConfig.allowedTagPattern);
  if (!tagPattern.test(payload.tag)) {
    throw new HttpError(403, 'forbidden', 'Tag is not allowed');
  }
}
