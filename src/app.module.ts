import { AssistantConfig } from '@config/assistant.config';
import BotConfig from '@config/bot.config';
import { FirebaseConfig } from '@config/firebase.config';
import { AssistantModule } from '@modules/assistant/assistant.module';
import { BotModule } from '@modules/bot';
import { MessageModule } from '@modules/message/message.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [BotConfig, FirebaseConfig, AssistantConfig],
    }),
    FirebaseModule,
    UserModule,
    BotModule,
    MessageModule,
    AssistantModule,
  ],
})
export class AppModule {}
