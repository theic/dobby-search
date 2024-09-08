export enum TokenTransactionType {
  ADD = 'add',
  SPEND = 'spend',
}

export interface TokenTransaction {
  id?: string;
  userId: string;
  amount: number;
  type: TokenTransactionType;
  description: string;
  createdAt: Date;
}
