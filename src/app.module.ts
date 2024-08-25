import { Module } from '@nestjs/common';
import { FirebaseModule } from './firebase/firebase.module';
import { UserModule } from '@modules/user/user.module';
import { BotModule } from '@modules/bot';
import BotConfig from '@config/bot.config';
import { FirebaseConfig } from '@config/firebase.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [BotConfig, FirebaseConfig],
    }),
    FirebaseModule,
    UserModule,
    BotModule,
  ],
})
export class AppModule {}
