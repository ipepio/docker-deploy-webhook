import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import { HttpError } from '../../errors/http-error';
import { getJob, getRecentJobs } from '../../queue/queue-manager';

const RecentQuerySchema = z.object({
  repository: z.string().optional(),
  environment: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function getJobController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    const job = await getJob(jobId);
    if (!job) {
      throw new HttpError(404, 'job_not_found', 'Job not found');
    }

    response.status(200).json(job);
  } catch (error) {
    next(error);
  }
}

export async function getRecentDeploymentsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = RecentQuerySchema.parse(request.query);
    const jobs = await getRecentJobs(query.repository, query.environment, query.limit);

    response.status(200).json({
      jobs: jobs.map((job) => ({
        id: job.id,
        repository: job.payload.repository,
        environment: job.payload.environment,
        tag: job.payload.tag,
        status: job.status,
        createdAt: job.createdAt,
        durationMs: job.durationMs,
        triggeredBy: job.payload.triggeredBy,
      })),
      total: jobs.length,
    });
  } catch (error) {
    next(error);
  }
}
