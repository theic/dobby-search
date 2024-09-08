import { FirebaseModule } from '@firebase/firebase.module';
import { AssistantModule } from '@modules/assistant/assistant.module';
import { LocalizationModule } from '@modules/localization/localization.module';
import { MessageModule } from '@modules/message/message.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotService } from './bot.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const botConfig = configService.get(ConfigType.BOT);
        return {
          token: botConfig.token,
          launchOptions: {
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
  providers: [BotService],
})
export class BotModule {}
