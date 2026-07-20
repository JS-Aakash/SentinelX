import { Response } from 'express';

export interface ApiResponseShape<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export class ApiResponse<T = unknown> {
  private res: Response;
  private statusCode: number;
  private message: string;
  private data?: T;
  private meta?: Record<string, unknown>;

  constructor(res: Response, statusCode: number, message: string, data?: T) {
    this.res = res;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  withMeta(meta: Record<string, unknown>): ApiResponse<T> {
    this.meta = meta;
    return this;
  }

  send(): void {
    const body: ApiResponseShape<T> = {
      success: this.statusCode < 400,
      message: this.message,
    };
    if (this.data !== undefined) body.data = this.data;
    if (this.meta !== undefined) body.meta = this.meta;
    this.res.status(this.statusCode).json(body);
  }
}

// Convenience helpers
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): void => {
  new ApiResponse<T>(res, statusCode, message, data).send();
};

export const sendCreated = <T>(res: Response, message: string, data?: T): void => {
  new ApiResponse<T>(res, 201, message, data).send();
};
