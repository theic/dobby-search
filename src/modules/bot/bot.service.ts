import { Injectable } from '@nestjs/common';
import { Ctx, Start, Update, On, Command } from 'nestjs-telegraf';
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
    const startPayload = (ctx.message as any).text.split(' ')[1];
    const user = await this.handleUser(ctx);

    if (startPayload) {
      // Deep link with assistant ID
      await this.handleDeepLink(ctx, user, startPayload);
    } else {
      // Regular start command
      await this.handleRegularStart(ctx, user);
    }
  }

  private async handleDeepLink(ctx: Context, user: any, assistantId: string) {
    try {
      const assistant = await this.assistantService.getAssistant(assistantId);
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
        `Welcome! You've been connected to the "${assistant.name}" assistant. How can I help you?`,
      );
    } catch (error) {
      console.error('Error handling deep link:', error);
      await ctx.reply(
        'Sorry, there was an error connecting to the specified assistant. Please try again later.',
      );
    }
  }

  private async handleRegularStart(ctx: Context, user: any) {
    const assistant = await this.assistantService.createAssistant({
      name: 'Telegram Bot Assistant',
      config: {
        configurable: {
          type: 'chatbot',
          'type==agent/agent_type': 'GPT 4o',
          'type==agent/interrupt_before_action': false,
          'type==agent/retrieval_description':
            'Can be used to look up information that was uploaded to this assistant.\nIf the user is referencing particular files, that is often a good hint that information may be here.\nIf the user asks a vague question, they are likely meaning to look up info from this retriever, and you should call it!',
          'type==agent/system_message': 'You are a helpful assistant.',
          'type==agent/tools': [],
          'type==chat_retrieval/llm_type': 'GPT 4o',
          'type==chat_retrieval/system_message': 'You are a helpful assistant.',
          'type==chatbot/llm_type': 'GPT 4o',
          'type==chatbot/system_message': 'You are a helpful assistant.',
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

  @Command('update')
  async updateInstructions(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const { assistantId } = await this.userService.getUserAssistantInfo(
      user.id,
    );

    const message = ctx.message['text'];
    const newInstructions = message.split('/update')[1].trim();

    if (!newInstructions) {
      await ctx.reply(
        'Please provide new instructions after the command. For example: /update_instructions Be more concise in your responses.',
      );
      return;
    }

    console.debug('newInstructions', newInstructions);

    try {
      await this.assistantService.updateAssistant({
        assistantId,
        name: 'Telegram Bot Assistant',
        config: {
          configurable: {
            type: 'chatbot',
            'type==agent/agent_type': 'Claude 2',
            'type==agent/interrupt_before_action': false,
            'type==agent/retrieval_description':
              'Can be used to look up information that was uploaded to this assistant.\nIf the user is referencing particular files, that is often a good hint that information may be here.\nIf the user asks a vague question, they are likely meaning to look up info from this retriever, and you should call it!',
            'type==agent/system_message': 'You are a helpful assistant.',
            'type==agent/tools': [],
            'type==chat_retrieval/llm_type': 'GPT 3.5 Turbo',
            'type==chat_retrieval/system_message':
              'You are a helpful assistant.',
            'type==chatbot/llm_type': 'Claude 2',
            'type==chatbot/system_message': newInstructions,
          },
        },
      });

      await ctx.reply('Assistant instructions updated successfully!');
    } catch (error) {
      console.error('Error updating assistant instructions:', error);
      await ctx.reply(
        'An error occurred while updating the assistant instructions. Please try again later.',
      );
    }
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const message = ctx.message['text'];

    const { threadId } = await this.userService.getUserAssistantInfo(user.id);

    const runResult = await this.assistantService.runAssistantStream({
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
