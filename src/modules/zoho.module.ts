import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ZohoService } from '../services/zoho/zoho.service';

@Module({
  imports: [HttpModule],
  providers: [ZohoService],
  exports: [ZohoService],
})
export class ZohoModule {}
