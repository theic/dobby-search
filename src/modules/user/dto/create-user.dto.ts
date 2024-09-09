import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  telegramId: number;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsObject()
  threads?: Record<string, string>; // Key: assistantId, Value: threadId

  @IsOptional()
  tokenBalance?: number;
}
