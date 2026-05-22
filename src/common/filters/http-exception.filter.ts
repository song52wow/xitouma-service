import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

const ERROR_CODE_MAP: Record<number, number> = {
  400: 40001,
  401: 40101,
  403: 40301,
  404: 40401,
  409: 40901,
  422: 42201,
  429: 42901,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 50001;
    let message = '服务内部错误';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = ERROR_CODE_MAP[status] ?? 50001;

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) || exception.message;
        details = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      code,
      message,
      details,
    });
  }
}
