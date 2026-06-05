import { ArrayMaxSize, IsArray, IsObject } from 'class-validator';

/** Hard cap per request — keeps a single import bounded and the txn loop sane. */
export const IMPORT_MAX_ROWS = 5000;

export class ImportRequestDto {
  /** Maps each target field key → the CSV column header it draws from. */
  @IsObject()
  mapping: Record<string, string>;

  /** Parsed CSV rows, each keyed by CSV column header. */
  @IsArray()
  @ArrayMaxSize(IMPORT_MAX_ROWS)
  rows: Record<string, string>[];
}
