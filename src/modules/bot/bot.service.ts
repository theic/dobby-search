import { AssistantConfig } from '@config/assistant.config';
import { FirebaseService } from '@firebase/firebase.service';
import { AssistantService } from '@modules/assistant/assistant.service';
import { UserType } from '@modules/user/enum';
import { UserService } from '@modules/user/user.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Injectable()
@Update()
export class BotService {
  private readonly assistantConfig: AssistantConfig;

  constructor(
    private readonly userService: UserService,
    private readonly firebaseService: FirebaseService,
    private readonly assistantService: AssistantService,
    private readonly configService: ConfigService,
  ) {
    this.assistantConfig = this.configService.get<AssistantConfig>(
      ConfigType.ASSISTANT,
    );
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    await this.userService.getOrCreateThread(
      user.id,
      this.assistantConfig.assistantId,
    );

    await ctx.reply(
      'Welcome to your Telegram bot! How can I assist you today?',
    );
  }

  @Command('bulk')
  async sendBulkMessage(@Ctx() ctx: Context) {
    const adminUser = await this.handleUser(ctx);
    if (adminUser.type !== UserType.ADMIN) {
      await ctx.reply('Sorry, this command is only available for admins.');
      return;
    }

    const message = ctx.message['text'].split('/bulk ')[1];
    if (!message) {
      await ctx.reply(
        'Please provide a message to send. Usage: /bulk Your message here',
      );
      return;
    }

    const users = await this.userService.getAllUsers(UserType.USER);
    let sentCount = 0;

    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(user.telegramId, message);
        sentCount++;
      } catch (error) {
        console.error(
          `Failed to send message to user ${user.telegramId}:`,
          error,
        );
      }
    }

    await ctx.reply(
      `Bulk message sent to ${sentCount} out of ${users.length} users.`,
    );
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    // Set bot to 'typing' status
    await ctx.sendChatAction('typing');

    const user = await this.handleUser(ctx);
    const message = ctx.message['text'];

    const threadId = await this.userService.getOrCreateThread(
      user.id,
      this.assistantConfig.assistantId,
    );

    const runResult = await this.assistantService.runAssistant({
      threadId,
      assistantId: this.assistantConfig.assistantId,
      input: {
        messages: {
          role: 'user',
          content: message,
        },
      },
      metadata: {},
      config: {},
    });

    console.debug('runResult', runResult);

    const threadState = await this.assistantService.getThreadState({
      threadId,
    });

    const aiResponse =
      threadState.values.messages.length > 0
        ? threadState.values.messages[threadState.values.messages.length - 1]
            .content
        : 'Sorry, no response from the assistant.';

    await ctx.reply(aiResponse);
  }

  private async handleUser(ctx: Context) {
    const telegramId = ctx.from.id;

    await this.firebaseService.createFirebaseUser(telegramId.toString());

    const user = await this.userService.findOrCreateUser({
      telegramId,
      username: ctx.from.username,
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
    });

    return user;
  }
}
