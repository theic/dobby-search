import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotService } from './bot.service';
import BotConfig from '@config/bot.config';
import { UserModule } from '@modules/user/user.module';
import { FirebaseModule } from '@firebase/firebase.module';
import { AssistantModule } from '@modules/assistant/assistant.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      useFactory: () => ({
        token: BotConfig().token,
      }),
    }),
    UserModule,
    FirebaseModule,
    AssistantModule,
  ],
  providers: [BotService],
})
export class BotModule {}
