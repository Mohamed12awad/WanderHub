import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// Server recomputes `total` (via calcTotals) and `order` (by index), so neither
// is accepted from the client — only the raw inputs are.
export class LineItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  // Percentage discount, 0–100.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}
