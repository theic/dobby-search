export class RunAssistantStreamDto {
  threadId: string;
  assistantId: string;
  input: any;
  metadata?: Record<string, any>;
  config?: Record<string, any>;
  stream_mode?: string;
}
