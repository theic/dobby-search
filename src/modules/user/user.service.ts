import { AssistantService } from '@modules/assistant/assistant.service';
import { TokenTransactionType } from '@modules/token-transaction/token-transaction.model';
import { TokenTransactionService } from '@modules/token-transaction/token-transaction.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserType } from './enum';
import { DEFAULT_TOKEN_BALANCE } from './user.constants';
import { User } from './user.model';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly assistantService: AssistantService,
    private readonly tokenTransactionService: TokenTransactionService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.create({
      ...createUserDto,
      tokenBalance: DEFAULT_TOKEN_BALANCE,
      type: UserType.USER,
    });
  }

  async getAllUsers(userType?: UserType): Promise<User[]> {
    return this.userRepository.findAll(userType);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updatedUser = await this.userRepository.update(id, updateUserDto);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id); // This will throw NotFoundException if user doesn't exist
    await this.userRepository.delete(id);
  }

  async findOrCreateUser(createUserDto: CreateUserDto): Promise<User> {
    let user = await this.userRepository.findByTelegramId(
      createUserDto.telegramId,
    );

    if (!user) {
      user = await this.createUser(createUserDto);
    }

    return user;
  }

  async addThreadToUser(
    userId: string,
    assistantId: string,
    threadId: string,
  ): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user.threads) {
      user.threads = {};
    }
    user.threads[assistantId] = threadId;
    await this.userRepository.update(userId, user);
  }

  async getOrCreateThread(
    userId: string,
    assistantId: string,
  ): Promise<string> {
    const user = await this.getUserById(userId);
    const threadId = user.threads ? user.threads[assistantId] : undefined;

    if (threadId) {
      return threadId;
    }

    const newThread = await this.assistantService.createThread({
      assistantId,
      metadata: { name: 'New Thread' },
    });

    await this.addThreadToUser(userId, assistantId, newThread.thread_id);

    return newThread.thread_id;
  }

  async addTokens(
    userId: string,
    amount: number,
    description: string,
  ): Promise<User> {
    const user = await this.getUserById(userId);
    user.tokenBalance += amount;
    const updatedUser = await this.userRepository.update(userId, user);

    await this.tokenTransactionService.createTransaction(
      userId,
      amount,
      TokenTransactionType.ADD,
      description,
    );

    return updatedUser;
  }

  async spendTokens(
    userId: string,
    amount: number,
    description: string,
  ): Promise<User> {
    const user = await this.getUserById(userId);
    user.tokenBalance -= amount;
    const updatedUser = await this.userRepository.update(userId, user);

    await this.tokenTransactionService.createTransaction(
      userId,
      amount,
      TokenTransactionType.SPEND,
      description,
    );

    return updatedUser;
  }

  async getTokenBalance(userId: string): Promise<number> {
    const user = await this.getUserById(userId);
    return user.tokenBalance;
  }

  async getTokenTransactionHistory(userId: string) {
    return this.tokenTransactionService.getTransactionHistory(userId);
  }
}
