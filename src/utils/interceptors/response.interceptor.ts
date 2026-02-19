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
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<Record<string, unknown>>();
        const statusCode = response.statusCode as number;

        // Determine message and toastMessage based on context or data
        // Ideally, controllers should return an object that includes message/data
        // But if they return just data, we wrap it.

        let message = 'Success';
        let toastMessage = 'Success';
        let responseData: unknown = data;

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const dataObj = data as Record<string, unknown>;
          if (typeof dataObj.message === 'string') {
            message = dataObj.message;
            delete dataObj.message;
          }
          if (typeof dataObj.toastMessage === 'string') {
            toastMessage = dataObj.toastMessage;
            delete dataObj.toastMessage;
          }
          // Check for specific structure manually returned by controller
          if (dataObj.data !== undefined) {
            responseData = dataObj.data;
          } else {
            responseData = data;
          }
        }

        return {
          statusCode: statusCode,
          isSuccess: true,
          message: message,
          data: (responseData as T) || ({} as T),
          toastMessage: toastMessage,
        };
      }),
    );
  }
}
