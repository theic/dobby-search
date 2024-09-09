import { AssistantConfig } from '@config/assistant.config';
import { BotConfig } from '@config/bot.config';
import { ServerConfig } from '@config/server.config';
import { FirebaseService } from '@firebase/firebase.service';
import { AssistantService } from '@modules/assistant/assistant.service';
import { LocalizationService } from '@modules/localization/localization.service';
import { TokenTransactionType } from '@modules/token-transaction/token-transaction.model';
import { UserType } from '@modules/user/enum';
import { User } from '@modules/user/user.model';
import { UserService } from '@modules/user/user.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import { Cache } from 'cache-manager';
import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Context } from 'telegraf';
import { InlineQuery } from 'telegraf/typings/core/types/typegram';

interface SessionData {
  user: User;
}

interface BotContext extends Context {
  session: SessionData;
}

@Injectable()
@Update()
export class BotService {
  private readonly assistantConfig: AssistantConfig;
  private readonly botConfig: BotConfig;
  private readonly serverConfig: ServerConfig;
  private rateLimiter: RateLimiterMemory;
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly userService: UserService,
    private readonly firebaseService: FirebaseService,
    private readonly assistantService: AssistantService,
    private readonly configService: ConfigService,
    private readonly localizationService: LocalizationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.assistantConfig = this.configService.get<AssistantConfig>(
      ConfigType.ASSISTANT,
    );
    this.botConfig = this.configService.get<BotConfig>(ConfigType.BOT);
    this.serverConfig = this.configService.get<ServerConfig>(ConfigType.SERVER);
    this.rateLimiter = new RateLimiterMemory({
      points: 5, // Number of points
      duration: 60, // Per 60 seconds
    });
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
    const batchSize = 100; // Adjust based on your needs
    let sentCount = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const promises = batch.map((user) =>
        ctx.telegram
          .sendMessage(user.telegramId, message)
          .then(() => sentCount++)
          .catch((error) => this.logger.error(error)),
      );
      await Promise.all(promises);
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

  @Command('buy_tokens')
  async buyTokens(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const args = ctx.message['text'].split(' ');

    if (args.length !== 2 || isNaN(Number(args[1]))) {
      const usageMessage = this.localizationService.translate(
        'buyTokensUsage',
        user.languageCode,
      );
      await ctx.reply(usageMessage);
      return;
    }

    const amount = parseInt(args[1]);
    const pricePerToken = this.botConfig.pricePerToken;
    const totalPrice = amount * pricePerToken;

    const invoice = {
      title: this.localizationService.translate(
        'buyTokensTitle',
        user.languageCode,
      ),
      description: this.localizationService.translate(
        'buyTokensDescription',
        user.languageCode,
        { amount },
      ),
      payload: `buy_tokens_${user.id}_${amount}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: `${amount} tokens`, amount: totalPrice }], // Amount in cents
    };

    await ctx.replyWithInvoice(invoice);
  }

  @On('pre_checkout_query')
  async onPreCheckoutQuery(@Ctx() ctx: Context) {
    // You can perform any pre-checkout validation here
    await ctx.answerPreCheckoutQuery(true);
  }

  @On('successful_payment')
  async onSuccessfulPayment(@Ctx() ctx: Context) {
    const user = await this.handleUser(ctx);
    const payment = ctx.message['successful_payment'];
    const [, , userId, amount] = payment.invoice_payload.split('_');

    if (userId === user.id) {
      await this.userService.addTokens(
        user.id,
        parseInt(amount),
        'Token purchase',
      );

      const successMessage = this.localizationService.translate(
        'buyTokensSuccess',
        user.languageCode,
        { amount },
      );
      await ctx.reply(successMessage);
    }
  }

  @On('message')
  async onMessage(@Ctx() ctx: BotContext) {
    try {
      await this.rateLimiter.consume(ctx.from.id);
    } catch (error) {
      await ctx.reply(
        'You are sending messages too quickly. Please wait a moment and try again.',
      );
      return;
    }

    await ctx.sendChatAction('typing');

    const user = await this.getOrCreateUserFromSession(ctx);

    const message = ctx.message['text'];
    const placeholderMessage = await ctx.reply('...');

    const startTime = Date.now();
    const response = await this.processMessage(user, message);
    const endTime = Date.now();

    const processingTime = endTime - startTime;
    this.logger.debug(`Response time: ${processingTime}ms`);

    let responseText = response;
    if (this.serverConfig.nodeEnv === 'development') {
      responseText += `\n\nResponse time: ${processingTime}ms`;
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      placeholderMessage.message_id,
      null,
      responseText,
    );
  }

  private async getOrCreateUserFromSession(ctx: BotContext): Promise<User> {
    const cacheKey = `user:${ctx.from.id}`;
    let user = await this.cacheManager.get<User>(cacheKey);

    if (!user) {
      user = await this.handleUser(ctx);
      await this.cacheManager.set(cacheKey, user, 3600000); // Cache for 1 hour
    }

    ctx.session = { user };
    return user;
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
    const estimatedTokens = this.estimateTokenUsage(message);

    const [threadId, userTokens] = await Promise.all([
      this.userService.getOrCreateThread(
        user.id,
        this.assistantConfig.assistantId,
      ),
      this.userService.getTokenBalance(user.id),
    ]);

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
      metadata: {
        languageCode: user.languageCode,
      },
      config: {},
    });

    this.logger.debug(runResult);

    const actualTokens = this.calculateActualTokenUsage(runResult);

    // Spend tokens asynchronously without waiting for the result
    this.userService
      .spendTokens(
        user.id,
        actualTokens,
        `Message processing: ${message.substring(0, 50)}...`,
      )
      .catch((error) => this.logger.error(error));

    if (runResult.messages && runResult.messages.length > 0) {
      const lastMessage = runResult.messages[runResult.messages.length - 1];
      return lastMessage.content;
    } else {
      return 'Sorry, no response from the assistant.';
    }
  }

  private estimateTokenUsage(message: string): number {
    // Implement a more accurate estimation based on your model's specifics
    // This is a simple example and should be adjusted based on your needs
    return Math.ceil(message.length / 4);
  }

  private calculateActualTokenUsage(runResult: any): number {
    return runResult.usage?.total_tokens ?? 0;
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
