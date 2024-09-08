import { AssistantConfig } from '@config/assistant.config';
import { FirebaseService } from '@firebase/firebase.service';
import { AssistantService } from '@modules/assistant/assistant.service';
import { LocalizationService } from '@modules/localization/localization.service';
import { TokenTransactionType } from '@modules/token-transaction/token-transaction.model';
import { UserType } from '@modules/user/enum';
import { User } from '@modules/user/user.model';
import { UserService } from '@modules/user/user.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { InlineQuery } from 'telegraf/typings/core/types/typegram';

@Injectable()
@Update()
export class BotService {
  private readonly assistantConfig: AssistantConfig;

  constructor(
    private readonly userService: UserService,
    private readonly firebaseService: FirebaseService,
    private readonly assistantService: AssistantService,
    private readonly configService: ConfigService,
    private readonly localizationService: LocalizationService,
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

    const welcomeMessage = this.localizationService.translate(
      'welcome',
      user.languageCode,
    );
    await ctx.reply(welcomeMessage);
  }

  @Command('bulk')
  async sendBulkMessage(@Ctx() ctx: Context) {
    const adminUser = await this.handleUser(ctx);
    if (adminUser.type !== UserType.ADMIN) {
      const adminOnlyMessage = this.localizationService.translate(
        'adminOnly',
        adminUser.languageCode,
      );
      await ctx.reply(adminOnlyMessage);
      return;
    }

    const message = ctx.message['text'].split('/bulk ')[1];
    if (!message) {
      const usageMessage = this.localizationService.translate(
        'bulkMessageUsage',
        adminUser.languageCode,
      );
      await ctx.reply(usageMessage);
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

    const sentMessage = this.localizationService.translate(
      'bulkMessageSent',
      adminUser.languageCode,
      {
        sentCount,
        totalCount: users.length,
      },
    );
    await ctx.reply(sentMessage);
  }

  @Command('balance')
  async checkBalance(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const balance = await this.userService.getTokenBalance(user.id);
    const transactions = await this.userService.getTokenTransactionHistory(
      user.id,
    );

    let message = this.localizationService.translate(
      'currentBalance',
      user.languageCode,
      { balance },
    );
    message +=
      '\n\n' +
      this.localizationService.translate(
        'recentTransactions',
        user.languageCode,
      );

    for (const transaction of transactions.slice(0, 5)) {
      // Show last 5 transactions
      const transactionType =
        transaction.type === TokenTransactionType.ADD ? '+' : '-';
      message += `\n${transactionType}${transaction.amount} - ${transaction.description}`;
    }

    await ctx.reply(message);
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    await ctx.sendChatAction('typing');
    const user = await this.handleUser(ctx);
    const message = ctx.message['text'];
    const response = await this.processMessage(user, message);
    await ctx.reply(response);
  }

  @On('inline_query')
  async onInlineQuery(@Ctx() ctx: Context) {
    const inlineQuery = ctx.inlineQuery as InlineQuery;
    const query = inlineQuery.query;

    if (!query) {
      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: '1',
          title: 'Type in search your request',
          input_message_content: {
            message_text: 'Type in search your request',
          },
        },
      ]);
      return;
    }

    const user = await this.handleUser(ctx);
    const response = await this.processMessage(user, query);

    const result = [
      {
        type: 'article',
        id: '1',
        title: 'AI Response',
        description: response.substring(0, 100) + '...',
        input_message_content: {
          message_text: response,
        },
      },
    ] as const;

    await ctx.answerInlineQuery(result);
  }

  private async processMessage(user: User, message: string): Promise<string> {
    const threadId = await this.userService.getOrCreateThread(
      user.id,
      this.assistantConfig.assistantId,
    );

    // Estimate token usage (you'll need to implement this based on your needs)
    const estimatedTokens = this.estimateTokenUsage(message);

    // Check if user has enough tokens
    const userTokens = await this.userService.getTokenBalance(user.id);
    if (userTokens < estimatedTokens) {
      return this.localizationService.translate(
        'insufficientTokens',
        user.languageCode,
      );
    }

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

    // Calculate actual token usage (you'll need to implement this based on the response)
    const actualTokens = this.calculateActualTokenUsage(runResult);

    // Deduct tokens from user's balance
    await this.userService.spendTokens(
      user.id,
      actualTokens,
      `Message processing: ${message.substring(0, 50)}...`,
    );

    const threadState = await this.assistantService.getThreadState({
      threadId,
    });

    return threadState.values.messages.length > 0
      ? threadState.values.messages[threadState.values.messages.length - 1]
          .content
      : 'Sorry, no response from the assistant.';
  }

  private estimateTokenUsage(message: string): number {
    // TODO: Implement a more sophisticated token estimation method
    return Math.ceil(message.length / 4);
  }

  private calculateActualTokenUsage(runResult: any): number {
    const messages = runResult.messages || [];
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.usage_metadata?.total_tokens ?? 0;
  }

  private async handleUser(ctx: Context) {
    const telegramId = ctx.from.id;

    await this.firebaseService.createFirebaseUser(telegramId.toString());

    const user = await this.userService.findOrCreateUser({
      telegramId,
      username: ctx.from.username,
      firstName: ctx.from.first_name || '',
      lastName: ctx.from.last_name || '',
      languageCode: ctx.from.language_code || '',
    });

    return user;
  }
}
