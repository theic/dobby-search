import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: any) {
    return this.userService.createUser(body);
  }

  @Get(':id')
  async getUser(@Param('id') userId: string) {
    return this.userService.getUser(userId);
  }

  @Put(':id')
  async updateUser(@Param('id') userId: string, @Body() body: any) {
    return this.userService.updateUser(userId, body);
  }

  @Delete(':id')
  async deleteUser(@Param('id') userId: string) {
    return this.userService.deleteUser(userId);
  }

  // Additional user-related endpoints as needed
}
