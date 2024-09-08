import { Injectable } from '@nestjs/common';
import {
  TokenTransaction,
  TokenTransactionType,
} from './token-transaction.model';
import { TokenTransactionRepository } from './token-transaction.repository';

@Injectable()
export class TokenTransactionService {
  constructor(
    private readonly tokenTransactionRepository: TokenTransactionRepository,
  ) {}

  async createTransaction(
    userId: string,
    amount: number,
    type: TokenTransactionType,
    description: string,
  ): Promise<TokenTransaction> {
    return this.tokenTransactionRepository.create({
      userId,
      amount,
      type,
      description,
      createdAt: new Date(),
    });
  }

  async getTransactionHistory(userId: string): Promise<TokenTransaction[]> {
    return this.tokenTransactionRepository.findByUserId(userId);
  }
}
