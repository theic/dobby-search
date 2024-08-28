export class RunAssistantDto {
  threadId: string;
  userId: string;
  messages?: { type: 'human' | 'ai'; content: string }[];
}
