import { MessageRole } from '@shared/enum';

export interface Message {
  id?: string;
  userId: string;
  content: string;
  createdAt: Date;
  threadId: string;
  role: MessageRole;
}
