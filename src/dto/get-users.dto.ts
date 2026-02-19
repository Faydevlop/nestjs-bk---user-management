import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsString,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Include users created on or after this date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Include users created on or before this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}

export class GetUsersSearchItemDto {
  @ApiProperty({ description: 'Keyword to search', example: 'john' })
  @IsString()
  term: string;

  @ApiProperty({
    description: 'Fields to search in',
    example: ['email'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  fields: string[];

  @ApiPropertyOptional({ description: 'Match starts with', example: true })
  @IsOptional()
  @IsBoolean()
  startsWith?: boolean;

  @ApiPropertyOptional({ description: 'Match ends with', example: false })
  @IsOptional()
  @IsBoolean()
  endsWith?: boolean;
}

export class GetUsersOptionsDto {
  @ApiPropertyOptional({
    description: 'Fields to sort by',
    example: ['createdAt'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sortBy?: string[];

  @ApiPropertyOptional({
    description: 'Sort order (true for descending)',
    example: [true],
  })
  @IsOptional()
  @IsArray()
  @IsBoolean({ each: true })
  sortDesc?: boolean[];

  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @IsOptional()
  @IsNumber()
  itemsPerPage?: number;
}

export class GetUsersDto {
  @ApiPropertyOptional({
    description: 'Fields to include (projection)',
    example: { email: 1, isVerified: 1 },
  })
  @IsOptional()
  @IsObject()
  projection?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Filter criteria' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GetUsersFilterDto)
  filters?: GetUsersFilterDto;

  @ApiPropertyOptional({
    description: 'Search settings',
    type: [GetUsersSearchItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GetUsersSearchItemDto)
  search?: GetUsersSearchItemDto[];

  @ApiPropertyOptional({ description: 'Pagination and sorting options' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GetUsersOptionsDto)
  options?: GetUsersOptionsDto;
}
