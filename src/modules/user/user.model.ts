import { UserType } from './enum';

export interface User {
  id?: string;
  telegramId: number;
  type: UserType;
  username?: string;
  firstName?: string;
  lastName?: string;
  threads?: Record<string, string>; // Key: assistantId, Value: threadId
}
