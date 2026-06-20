import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { requestIdStorage } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const REQUEST_ID_HEADER = 'X-Request-Id';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const incomingId = req.header(REQUEST_ID_HEADER);
  const requestId = incomingId || randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !body.requestId) {
      body.requestId = requestId;
    }
    return originalJson(body);
  };

  requestIdStorage.run(requestId, () => {
    next();
  });
};
