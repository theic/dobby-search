import { Module } from '@nestjs/common';
import { FirestoreModule } from './firestore/firestore.module';
import { UserModule } from '@modules/user';

@Module({
  imports: [FirestoreModule, UserModule],
})
export class AppModule {}
