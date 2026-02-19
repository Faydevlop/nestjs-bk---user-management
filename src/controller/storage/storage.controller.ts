import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { StorageService } from '../../services/storage/storage.service';
import { PresignedUrlDto } from '../../dto/presigned-url.dto';

@ApiTags('Generic')
@Controller('generic')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('image/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate S3 presigned URL for image upload' })
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    const presignedUrl = await this.storageService.getPresignedUrl(dto.path);
    return {
      message: 'Presigned URL generated successfully',
      data: { presignedUrl },
    };
  }

  @Delete('image/:key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a file from S3' })
  async deleteFile(@Param('key') key: string) {
    await this.storageService.deleteFile(key);
    return {
      message: 'File deleted successfully',
    };
  }
}
