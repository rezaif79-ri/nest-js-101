import { IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateUserRequest {
  @IsString()
  @Length(3, 50, {
    message: 'Name must be between 3 and 50 characters.',
  })
  name!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Age must be a number.' })
  age!: number;

  @IsOptional()
  @IsString()
  @Length(3, 50, {
    message: 'Address must be between 3 and 50 characters.',
  })
  address?: string | null;
}

export class CreateUserResponse {
  message!: string;
}
