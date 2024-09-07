import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './message.model';
import { MessageRepository } from './message.repository';

@Injectable()
export class MessageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  async createMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    return this.messageRepository.create(createMessageDto);
  }

  async getMessagesByUserIdAndThreadId(
    userId: string,
    threadId: string,
  ): Promise<Message[]> {
    return this.messageRepository.findByUserIdAndThreadId(userId, threadId);
  }
}
