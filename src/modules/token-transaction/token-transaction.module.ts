import { FirebaseModule } from '@firebase/firebase.module';
import { Module } from '@nestjs/common';
import { TokenTransactionRepository } from './token-transaction.repository';
import { TokenTransactionService } from './token-transaction.service';

@Module({
  imports: [FirebaseModule],
  providers: [TokenTransactionService, TokenTransactionRepository],
  exports: [TokenTransactionService],
})
export class TokenTransactionModule {}
