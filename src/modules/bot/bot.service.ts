import { Injectable } from '@nestjs/common';
import { Ctx, Start, Update, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserService } from '@modules/user/user.service';
import { FirebaseService } from '@firebase/firebase.service';
import { AssistantService } from '@modules/assistant/assistant.service';

@Injectable()
@Update()
export class BotService {
  constructor(
    private readonly userService: UserService,
    private readonly firebaseService: FirebaseService,
    private readonly assistantService: AssistantService,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const assistant = await this.assistantService.createAssistant({
      name: 'Telegram Bot Assistant',
      config: {
        configurable: {
          type: 'chatbot',
        },
      },
      userId: user.id,
    });
    const thread = await this.assistantService.createThread({
      assistantId: assistant.assistant_id,
      name: 'Telegram Thread',
      userId: user.id,
    });
    await this.userService.updateUserAssistantInfo(
      user.id,
      assistant.assistant_id,
      thread.thread_id,
    );
    await ctx.reply(
      'Welcome to your Telegram bot! How can I assist you today?',
    );
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const message = ctx.message['text'];

    const { assistantId, threadId } =
      await this.userService.getUserAssistantInfo(user.id);

    console.log('{ assistantId, threadId, message }', {
      assistantId,
      threadId,
      message,
    });

    const runResult = await this.assistantService.runAssistant({
      threadId,
      userId: user.id,
      messages: [{ type: 'human', content: message }],
    });

    console.log('runResult', runResult);

    const threadState = await this.assistantService.getThreadState({
      threadId,
      userId: user.id,
    });

    console.log('threadState', threadState);

    const aiResponse =
      threadState.values[threadState.values.length - 1].content;

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
