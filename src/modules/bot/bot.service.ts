import { Injectable } from '@nestjs/common';
import { Ctx, Start, Update, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserService } from '@modules/user/user.service';
import { FirebaseService } from '@firebase/firebase.service';

@Injectable()
@Update()
export class BotService {
  constructor(
    private readonly userService: UserService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await this.handleUser(ctx);
    await ctx.reply('Welcome to your Telegram bot!');
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    await this.handleUser(ctx);
    // Process the message here
  }

  private async handleUser(ctx: Context) {
    const telegramId = ctx.from.id;

    // Create user in Firebase Auth using telegramId as the unique identifier
    await this.firebaseService.createFirebaseUser(telegramId.toString());

    // Create or update user in Firestore
    const user = await this.userService.findOrCreateUser({
      telegramId,
      username: ctx.from.username,
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
    });

    // You can do something with the user object if needed
    return user;
  }
}
