import { FirebaseService } from '@firebase/firebase.service';
import { Injectable } from '@nestjs/common';
import { TokenTransaction } from './token-transaction.model';

@Injectable()
export class TokenTransactionRepository {
  constructor(private firebaseService: FirebaseService) {}

  async create(
    transaction: Omit<TokenTransaction, 'id'>,
  ): Promise<TokenTransaction> {
    const db = this.firebaseService.getFirestore();
    const userRef = db.collection('users').doc(transaction.userId);
    const transactionRef = await userRef.collection('tokenTransactions').add({
      ...transaction,
      createdAt: new Date(),
    });
    return { id: transactionRef.id, ...transaction };
  }

  async findByUserId(userId: string): Promise<TokenTransaction[]> {
    const db = this.firebaseService.getFirestore();
    const userRef = db.collection('users').doc(userId);
    const snapshot = await userRef
      .collection('tokenTransactions')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as TokenTransaction,
    );
  }
}
