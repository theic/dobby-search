import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserRepository } from './user.repository';

@Module({
  imports: [FirebaseModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
