import { UserType } from './enum';

export type AssistantId = string;

export type ThreadId = string;

export interface User {
  id?: string;
  telegramId: number;
  type: UserType;
  tokenBalance: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string; // Added language_code
  threads?: Record<AssistantId, ThreadId>; // Key: assistantId, Value: threadId
}
