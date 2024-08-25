import { registerAs } from '@nestjs/config';

export default registerAs('bot', () => {
  const { TELEGRAM_BOT_TOKEN } = process.env;

  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram bot token must be declared explicitly.');
  }

  return {
    token: TELEGRAM_BOT_TOKEN,
  };
});
