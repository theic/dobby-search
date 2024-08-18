import { Module } from '@nestjs/common';
import { FirestoreModule } from '@firestore/firestore.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [FirestoreModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
