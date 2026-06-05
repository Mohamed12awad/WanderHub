import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { BulkAction } from '../bulk.service';

export class BulkActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  ids: string[];

  @IsIn(['delete', 'assignOwner', 'setStatus'])
  action: BulkAction;

  /** Owner id for assignOwner, status value for setStatus. */
  @IsOptional()
  @IsString()
  value?: string;
}
