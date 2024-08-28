import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService {
  private firestore: admin.firestore.Firestore;

  constructor(private readonly configService: ConfigService) {
    const { projectId, clientEmail, privateKey } =
      this.configService.get('firebase');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    this.firestore = admin.firestore();
  }

  getFirestore(): admin.firestore.Firestore {
    return this.firestore;
  }

  async createFirebaseUser(telegramId: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().createUser({
        uid: telegramId,
      });
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/uid-already-exists') {
        // If the user already exists, retrieve and return the existing user
        return await admin.auth().getUser(telegramId);
      }
      console.error('Error creating new user:', error);
      throw error;
    }
  }
}
