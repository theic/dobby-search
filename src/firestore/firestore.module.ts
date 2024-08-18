import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import firestoreConfig from '@config/firestore.config';
import { Firestore } from '@google-cloud/firestore';
import { ConfigType } from '@shared/enum';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [firestoreConfig],
    }),
  ],
  providers: [
    {
      provide: Firestore,
      useFactory: (configService: ConfigService) => {
        const config = configService.get(ConfigType.FIRESTORE);
        return new Firestore({
          projectId: config.projectId,
          credentials: {
            client_email: config.clientEmail,
            private_key: config.privateKey,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [Firestore],
})
export class FirestoreModule {}
