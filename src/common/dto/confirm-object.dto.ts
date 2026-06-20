import { IsString, Length } from 'class-validator';

/** Confirms an uploaded object by the key the server issued at presign time. */
export class ConfirmObjectDto {
  @IsString()
  @Length(1, 1024)
  objectKey!: string;
}
