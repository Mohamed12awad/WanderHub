import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class MergeDto {
  @IsString()
  surviveId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mergeIds: string[];
}
