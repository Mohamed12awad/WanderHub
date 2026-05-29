import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

// Server recomputes `total` (via calcTotals) and `order` (by index), so neither
// is accepted from the client — only the raw inputs are.
export class LineItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}
