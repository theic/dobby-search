import { AssistantConfig } from '@config/assistant.config';
import { FirebaseService } from '@firebase/firebase.service';
import { AssistantService } from '@modules/assistant/assistant.service';
import { MessageService } from '@modules/message/message.service';
import { UserService } from '@modules/user/user.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType, MessageRole } from '@shared/enum';
import { Ctx, On, Start, Update } from 'nestjs-telegraf';
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
    private readonly messageService: MessageService,
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

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
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

    // Save user message
    await this.messageService.createMessage({
      userId: user.id,
      content: message,
      role: MessageRole.HUMAN,
      threadId,
    });

    // Save assistant message
    await this.messageService.createMessage({
      userId: user.id,
      content: aiResponse,
      role: MessageRole.AI,
      threadId,
    });

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
