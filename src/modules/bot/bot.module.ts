import BotConfig from '@config/bot.config';
import { FirebaseModule } from '@firebase/firebase.module';
import { AssistantModule } from '@modules/assistant/assistant.module';
import { MessageModule } from '@modules/message/message.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotService } from './bot.service';

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
    MessageModule,
  ],
  providers: [BotService],
})
export class BotModule {}
