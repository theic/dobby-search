import { UserType } from './enum';

export interface User {
  id?: string;
  telegramId: number;
  type: UserType;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string; // Added language_code
  threads?: Record<string, string>; // Key: assistantId, Value: threadId
}
