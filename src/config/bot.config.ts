import { registerAs } from '@nestjs/config';
import { ConfigType } from '@shared/enum';

export interface BotConfig {
  token: string;
  webhookDomain: string;
  webhookPath: string;
}

export const BotConfig = registerAs(ConfigType.BOT, () => {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_DOMAIN, TELEGRAM_WEBHOOK_PATH } =
    process.env;

  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram bot token must be declared explicitly.');
  }

  if (!TELEGRAM_WEBHOOK_DOMAIN) {
    throw new Error('Telegram webhook domain must be declared explicitly.');
  }

  if (!TELEGRAM_WEBHOOK_PATH) {
    throw new Error('Telegram webhook path must be declared explicitly.');
  }

  return {
    token: TELEGRAM_BOT_TOKEN,
    webhookDomain: TELEGRAM_WEBHOOK_DOMAIN,
    webhookPath: TELEGRAM_WEBHOOK_PATH,
  };
});
