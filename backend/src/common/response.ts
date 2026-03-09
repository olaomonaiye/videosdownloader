import { FastifyReply } from 'fastify';
import { AppError } from './errors';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errorId?: string;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode: number = 200, meta?: ApiResponse['meta']): void {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  reply.status(statusCode).send(response);
}

export function sendError(reply: FastifyReply, error: AppError | Error): void {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const response: ApiResponse = {
    success: false,
    error: {
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      message: isAppError ? error.message : 'An unexpected error occurred',
      errorId: isAppError ? error.errorId : undefined,
    },
  };
  reply.status(statusCode).send(response);
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): void {
  sendSuccess(reply, data, 200, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
