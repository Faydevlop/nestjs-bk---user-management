import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlDto {
  @ApiProperty({
    description: 'Path or file name for the file to upload',
    example: 'uploads/image-123.png',
  })
  @IsNotEmpty()
  @IsString()
  path: string;
}
