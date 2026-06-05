import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSavedViewDto {
  @IsString() @IsNotEmpty() @MaxLength(40)
  module: string;

  @IsString() @IsNotEmpty() @MaxLength(60)
  name: string;

  /** Serialized URLSearchParams (q, filters, sort, dir). */
  @IsString() @MaxLength(2000)
  query: string;
}
