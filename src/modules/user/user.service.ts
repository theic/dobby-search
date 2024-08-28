import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from './user.model';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.create(createUserDto);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
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

  async findOrCreateUser(userData: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    let user = await this.userRepository.findByTelegramId(userData.telegramId);

    if (!user) {
      const createUserDto: CreateUserDto = {
        telegramId: userData.telegramId,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      };
      user = await this.createUser(createUserDto);
    }

    return user;
  }

  async updateUserAssistantInfo(
    userId: string,
    assistantId: string,
    threadId: string,
  ): Promise<User> {
    return this.userRepository.update(userId, { assistantId, threadId });
  }

  async getUserAssistantInfo(
    userId: string,
  ): Promise<{ assistantId: string; threadId: string }> {
    const user = await this.getUserById(userId);
    return { assistantId: user.assistantId, threadId: user.threadId };
  }
}
