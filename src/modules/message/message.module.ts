import { FirebaseModule } from '@firebase/firebase.module';
import { Module } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { MessageService } from './message.service';

@Module({
  imports: [FirebaseModule],
  providers: [MessageService, MessageRepository],
  exports: [MessageService],
})
export class MessageModule {}
