import { Transform, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class FindUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;

    return String(value).split(",").map((name) => name.trim())
  })
  @IsArray()
  @IsString({ each: true })
  @Length(3, 100, {
    each: true,
    message: 'Name query must be between 3 and 100 characters.',
  })
  names?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Age must be a number.' })
  age?: number;
}
