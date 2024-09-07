import { Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserType } from './enum';
import { User } from './user.model';

@Injectable()
export class UserRepository {
  private readonly usersCollection: FirebaseFirestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.usersCollection = this.firebaseService
      .getFirestore()
      .collection('users');
  }

  async create(user: User): Promise<User> {
    const docRef = await this.usersCollection.add(user);
    return { id: docRef.id, ...user };
  }

  async findAll(userType?: UserType): Promise<User[]> {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      this.usersCollection;

    if (userType) {
      query = query.where('type', '==', userType);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User);
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.usersCollection.doc(id).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as User) : null;
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    await this.usersCollection.doc(id).update(user);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.usersCollection.doc(id).delete();
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    const snapshot = await this.usersCollection
      .where('telegramId', '==', telegramId)
      .get();
    const doc = snapshot.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as User) : null;
  }
}
