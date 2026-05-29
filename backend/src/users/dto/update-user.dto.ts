import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// All fields optional on update, including password (only re-hashed if present).
export class UpdateUserDto extends PartialType(CreateUserDto) {}
