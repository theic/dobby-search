export interface User {
  id?: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  threads?: Record<string, string>; // Key: assistantId, Value: threadId
}
