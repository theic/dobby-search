import { BotConfig } from '@config/bot.config';
import { ServerConfig } from '@config/server.config';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ConfigType } from '@shared/enum';
import { getBotToken } from 'nestjs-telegraf';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);

  const botConfig = configService.get<BotConfig>(ConfigType.BOT);
  const bot = app.get(getBotToken());
  app.use(bot.webhookCallback(botConfig.webhookPath));

  const serverConfig = configService.get<ServerConfig>(ConfigType.SERVER);
  await app.listen(serverConfig.port);
  console.log(
    `Application is running on: http://localhost:${serverConfig.port}`,
  );
}
bootstrap();
