import { FirebaseModule } from '@firebase/firebase.module';
import { AssistantModule } from '@modules/assistant/assistant.module';
import { LocalizationModule } from '@modules/localization/localization.module';
import { MessageModule } from '@modules/message/message.module';
import { UserModule } from '@modules/user/user.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotService } from './bot.service';
import { StreamProcessingService } from './stream-processing.service';

@Module({
  imports: [
    CacheModule.register(),
    TelegrafModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const botConfig = configService.get(ConfigType.BOT);
        return {
          token: botConfig.token,
          middlewares: [session()],
          launchOptions: {
            dropPendingUpdates: true,
            webhook: {
              domain: botConfig.webhookDomain,
              hookPath: botConfig.webhookPath,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    UserModule,
    FirebaseModule,
    AssistantModule,
    MessageModule,
    LocalizationModule,
  ],
  providers: [BotService, StreamProcessingService],
})
export class BotModule {}
