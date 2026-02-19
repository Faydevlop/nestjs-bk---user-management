import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TallyService } from '../services/tally/tally.service';

@Module({
  imports: [HttpModule],
  providers: [TallyService],
  exports: [TallyService],
})
export class TallyModule {}
