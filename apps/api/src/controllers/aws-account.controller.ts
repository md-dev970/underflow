import type { Request, Response } from "express";

import { awsAccountService } from "../services/aws-account.service.js";
import { costService } from "../services/cost.service.js";
import { AppError } from "../utils/app-error.js";
import { requireRouteParam } from "../utils/route-params.js";
import { validate } from "../utils/validation.js";
import {
  costQuerySchema,
  createAwsAccountSchema,
  syncHistoryQuerySchema,
  syncAwsAccountSchema,
  updateAwsAccountSchema,
} from "../validators/aws-account.schemas.js";

const toSyncRangeInput = (
  payload: ReturnType<typeof syncAwsAccountSchema.parse>,
): { from?: string | undefined; to?: string | undefined } => {
  const input: { from?: string | undefined; to?: string | undefined } = {};

  if (payload.from !== undefined) {
    input.from = payload.from;
  }

  if (payload.to !== undefined) {
    input.to = payload.to;
  }

  return input;
};

export const awsAccountController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(createAwsAccountSchema, req.body);
    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const awsAccount = await awsAccountService.createForWorkspace(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(201).json({ awsAccount });
  },

  async list(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const awsAccounts = await awsAccountService.listForWorkspace(
      workspaceId,
      req.user.id,
    );

    res.status(200).json({ awsAccounts });
  },

  async get(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const awsAccountId = requireRouteParam(req.params.id, "id");
    const awsAccount = await awsAccountService.getForUser(awsAccountId, req.user.id);

    res.status(200).json({ awsAccount });
  },

  async update(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const awsAccountId = requireRouteParam(req.params.id, "id");
    const input = validate(updateAwsAccountSchema, req.body);
    const awsAccount = await awsAccountService.updateForUser(awsAccountId, req.user.id, input);

    res.status(200).json({ awsAccount });
  },

  async remove(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const awsAccountId = requireRouteParam(req.params.id, "id");
    const deleted = await awsAccountService.deleteForUser(awsAccountId, req.user.id);

    res.status(200).json({ deleted });
  },

  async verify(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const awsAccountId = requireRouteParam(req.params.id, "id");
    const awsAccount = await awsAccountService.verifyForUser(awsAccountId, req.user.id);

    res.status(200).json({ awsAccount });
  },

  async sync(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const range = toSyncRangeInput(validate(syncAwsAccountSchema, req.body));
    const awsAccountId = requireRouteParam(req.params.id, "id");
    const result = await costService.syncAwsAccountForUser(awsAccountId, req.user.id, range);

    res.status(200).json(result);
  },

  async summary(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(costQuerySchema, req.query);
    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const summary = await costService.getSummaryForWorkspace(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(200).json({ summary });
  },

  async byService(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(costQuerySchema, req.query);
    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const services = await costService.getByServiceForWorkspace(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(200).json({ services });
  },

  async timeseries(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(costQuerySchema, req.query);
    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const points = await costService.getTimeseriesForWorkspace(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(200).json({ points });
  },

  async syncHistory(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const input = validate(syncHistoryQuerySchema, req.query);
    const workspaceId = requireRouteParam(req.params.workspaceId, "workspaceId");
    const syncRuns = await costService.getSyncHistoryForWorkspace(
      workspaceId,
      req.user.id,
      input,
    );

    res.status(200).json({ syncRuns });
  },
};
