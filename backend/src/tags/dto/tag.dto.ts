import { ArrayNotEmpty, IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class RenameTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  newTag!: string;
}

export class BulkTagDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  customerIds!: string[];
}
