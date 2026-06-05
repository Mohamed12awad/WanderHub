import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiTargetDto {
  @IsIn(['customers', 'deals', 'leads'])
  entity: string;

  @IsString()
  id: string;
}

export class SetAiConfigDto {
  @IsOptional() @IsIn(['anthropic', 'google', 'openai'])
  provider?: string;

  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  @IsOptional() @IsBoolean()
  enabled?: boolean;
}

export class SetAiKeyDto {
  @IsString() @MaxLength(400)
  key: string;

  /** "workspace" (default) or "user" (personal override). */
  @IsOptional() @IsIn(['workspace', 'user'])
  scope?: 'workspace' | 'user';
}
