import { FirebaseService } from '@firebase/firebase.service';
import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './message.model';

@Injectable()
export class MessageRepository {
  constructor(private firebaseService: FirebaseService) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const { userId, threadId, ...messageData } = createMessageDto;
    const userMessagesCollection = this.getUserMessagesCollection(
      userId,
      threadId,
    );

    const docRef = await userMessagesCollection.add({
      ...messageData,
      createdAt: new Date(),
    });

    return { id: docRef.id, ...createMessageDto, createdAt: new Date() };
  }

  async findByUserIdAndThreadId(
    userId: string,
    threadId: string,
  ): Promise<Message[]> {
    const userMessagesCollection = this.getUserMessagesCollection(
      userId,
      threadId,
    );

    const snapshot = await userMessagesCollection
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Message,
    );
  }

  private getUserMessagesCollection(userId: string, threadId: string) {
    return this.firebaseService
      .getFirestore()
      .collection('users')
      .doc(userId)
      .collection('threads')
      .doc(threadId)
      .collection('messages');
  }
}
