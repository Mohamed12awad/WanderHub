import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// The frontend submits the relation alias `linkedTo` (+ `linkedModel`); the
// service resolves it to linkedToId and derives customerId/dealId/productId/
// expenseReportId. createdById comes from the auth context.
export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  // Frontend field; the service maps this to linkedToId.
  @IsString()
  @IsNotEmpty()
  linkedTo: string;

  @IsString()
  @IsNotEmpty()
  linkedModel: string;

  // Accepted as an alternative to `linkedTo` for non-UI callers.
  @IsOptional()
  @IsString()
  linkedToId?: string;
}
