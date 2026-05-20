import { IsOptional, IsString, Length } from 'class-validator';

export class FindUsersQueryDto {
  @IsOptional()
  @IsString()
  @Length(3, 100, {
    message: 'Name query must be between 3 and 100 characters.',
  })
  name?: string;
}
