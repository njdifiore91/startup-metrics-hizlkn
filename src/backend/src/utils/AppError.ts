import { CustomError } from 'ts-custom-error';

export class AppError extends CustomError {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly meta?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    meta?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
  }
} 