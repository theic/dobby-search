import { AssistantModule } from '@modules/assistant/assistant.module';
import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [FirebaseModule, AssistantModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
