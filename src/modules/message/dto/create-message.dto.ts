import { MessageRole } from '@shared/enum';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  threadId: string;

  @IsEnum(MessageRole)
  @IsNotEmpty()
  role: MessageRole;

  @IsDate()
  createdAt?: Date;
}
