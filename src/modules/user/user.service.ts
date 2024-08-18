import { Injectable } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';

@Injectable()
export class UserService {
  private collection: FirebaseFirestore.CollectionReference;

  constructor(private firestore: Firestore) {
    this.collection = this.firestore.collection('users');
  }

  async createUser(data: any): Promise<string> {
    const docRef = this.collection.doc();
    await docRef.set(data);
    return docRef.id;
  }

  async getUser(userId: string): Promise<any> {
    const docRef = this.collection.doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    return doc.data();
  }

  async updateUser(userId: string, data: any): Promise<void> {
    const docRef = this.collection.doc(userId);
    await docRef.update(data);
  }

  async deleteUser(userId: string): Promise<void> {
    const docRef = this.collection.doc(userId);
    await docRef.delete();
  }

  // Additional user-related operations as needed
}
