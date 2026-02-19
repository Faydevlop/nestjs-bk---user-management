import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DatabaseService } from '../../db/database.service';

@Injectable()
export class DatabaseActivityInterceptor implements NestInterceptor {
  constructor(private readonly databaseService: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.databaseService.recordActivity();
    return next.handle();
  }
}
