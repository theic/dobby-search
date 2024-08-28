import { registerAs } from '@nestjs/config';

export const OpenGptsConfig = registerAs('opengpts', () => {
  const { OPENGPTS_BASE_URL } = process.env;

  if (!OPENGPTS_BASE_URL) {
    throw new Error('OpenGpts base URL must be declared explicitly.');
  }

  return {
    baseUrl: OPENGPTS_BASE_URL,
  };
});
