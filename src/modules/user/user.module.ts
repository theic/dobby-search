import { FirebaseModule } from '@firebase/firebase.module';
import { AssistantModule } from '@modules/assistant/assistant.module';
import { TokenTransactionModule } from '@modules/token-transaction/token-transaction.module';
import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [FirebaseModule, AssistantModule, TokenTransactionModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
