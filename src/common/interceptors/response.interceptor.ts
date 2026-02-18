import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                const ctx = context.switchToHttp();
                const response = ctx.getResponse();
                const statusCode = response.statusCode;

                // Determine message and toastMessage based on context or data
                // Ideally, controllers should return an object that includes message/data
                // But if they return just data, we wrap it.

                let message = 'Success';
                let toastMessage = 'Success';
                let responseData = data;

                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    if (data.message) {
                        message = data.message;
                        delete data.message;
                    }
                    if (data.toastMessage !== undefined) {
                        toastMessage = data.toastMessage;
                        delete data.toastMessage;
                    }
                    // Check for specific structure manually returned by controller
                    if (data.data) {
                        responseData = data.data;
                    } else {
                        responseData = data;
                    }
                }

                return {
                    statusCode: statusCode,
                    isSuccess: true,
                    message: message,
                    data: responseData || {},
                    toastMessage: toastMessage,
                };
            }),
        );
    }
}
