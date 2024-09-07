import { registerAs } from '@nestjs/config';

export interface AssistantConfig {
  baseUrl: string;
  assistantId: string;
  apiKey: string;
}

export const AssistantConfig = registerAs('assistant', (): AssistantConfig => {
  const {
    LANGGRAPH_AGENT_BASE_URL,
    LANGGRAPH_ASSISTANT_ID,
    LANGGRAPH_API_KEY,
  } = process.env;

  if (!LANGGRAPH_AGENT_BASE_URL) {
    throw new Error('Assistant base URL must be declared explicitly.');
  }

  if (!LANGGRAPH_ASSISTANT_ID) {
    throw new Error('Assistant ID must be declared explicitly.');
  }

  if (!LANGGRAPH_API_KEY) {
    throw new Error('Langgraph API key must be declared explicitly.');
  }

  return {
    baseUrl: LANGGRAPH_AGENT_BASE_URL,
    assistantId: LANGGRAPH_ASSISTANT_ID,
    apiKey: LANGGRAPH_API_KEY,
  };
});
