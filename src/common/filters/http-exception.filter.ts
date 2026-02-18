import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let message = 'An error occurred';
        if (typeof exceptionResponse === 'object' && (exceptionResponse as any).message) {
            const msg = (exceptionResponse as any).message;
            message = Array.isArray(msg) ? msg[0] : msg;
        } else if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        }

        let toastMessage = message;
        if (typeof exceptionResponse === 'object' && (exceptionResponse as any).toastMessage) {
            toastMessage = (exceptionResponse as any).toastMessage;
        }

        if (message === 'User not found') {
            toastMessage = 'User not found please signup';
        }

        response
            .status(status)
            .json({
                statusCode: status,
                isSuccess: false,
                message: message,
                data: {},
                toastMessage: toastMessage,
            });
    }
}
