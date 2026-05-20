import { IsString, Length } from 'class-validator';

export class CreateUserRequest {
  @IsString()
  @Length(3, 50, {
    message: 'Name must be between 3 and 50 characters.',
  })
  name!: string;
}

export class CreateUserResponse {
  message!: string;
}
