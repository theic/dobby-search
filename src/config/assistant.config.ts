import { registerAs } from '@nestjs/config';

export const AssistantConfig = registerAs('assistant', () => {
  const { LANGGRAPH_AGENT_BASE_URL } = process.env;

  if (!LANGGRAPH_AGENT_BASE_URL) {
    throw new Error('Assistant base URL must be declared explicitly.');
  }

  return {
    baseUrl: LANGGRAPH_AGENT_BASE_URL,
  };
});
