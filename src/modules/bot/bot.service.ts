import { AssistantConfig } from '@config/assistant.config';
import { BotConfig } from '@config/bot.config';
import { ServerConfig } from '@config/server.config';
import { FirebaseService } from '@firebase/firebase.service';
import { AssistantService } from '@modules/assistant/assistant.service';
import { RunAssistantStreamDto } from '@modules/assistant/dto';
import { LocalizationService } from '@modules/localization/localization.service';
import { TokenTransactionType } from '@modules/token-transaction/token-transaction.model';
import { UserType } from '@modules/user/enum';
import { User } from '@modules/user/user.model';
import { UserService } from '@modules/user/user.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import { TranslationKey } from '@shared/enum/translation-keys.enum';
import { Cache } from 'cache-manager';
import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Context } from 'telegraf';
import { InlineQuery } from 'telegraf/typings/core/types/typegram';
import { MessageType } from '../assistant/enums/message-type.enum';
import { BotContext } from './interfaces';
import { StreamProcessingService } from './stream-processing.service';

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
    private readonly streamProcessingService: StreamProcessingService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.assistantConfig = this.configService.get<AssistantConfig>(
      ConfigType.ASSISTANT,
    );
    this.botConfig = this.configService.get<BotConfig>(ConfigType.BOT);
    this.serverConfig = this.configService.get<ServerConfig>(ConfigType.SERVER);
    this.rateLimiter = new RateLimiterMemory({
      points: 5, // Number of points
      duration: 30, // Per 30 seconds
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
      TranslationKey.WELCOME,
      user.languageCode,
    );
    await ctx.reply(welcomeMessage);
  }

  @Command('bulk')
  async sendBulkMessage(@Ctx() ctx: Context) {
    const adminUser = await this.handleUser(ctx);
    if (adminUser.type !== UserType.ADMIN) {
      const adminOnlyMessage = this.localizationService.translate(
        TranslationKey.ADMIN_ONLY,
        adminUser.languageCode,
      );
      await ctx.reply(adminOnlyMessage);
      return;
    }

    const message = ctx.message['text'].split('/bulk ')[1];
    if (!message) {
      const usageMessage = this.localizationService.translate(
        TranslationKey.BULK_MESSAGE_USAGE,
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
          .catch((error) => Logger.error(error)),
      );
      await Promise.all(promises);
    }

    const sentMessage = this.localizationService.translate(
      TranslationKey.BULK_MESSAGE_SENT,
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
      TranslationKey.CURRENT_BALANCE,
      user.languageCode,
      { balance },
    );
    message +=
      '\n\n' +
      this.localizationService.translate(
        TranslationKey.RECENT_TRANSACTIONS,
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
        TranslationKey.BUY_TOKENS_USAGE,
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
        TranslationKey.BUY_TOKENS_TITLE,
        user.languageCode,
      ),
      description: this.localizationService.translate(
        TranslationKey.BUY_TOKENS_DESCRIPTION,
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
        TranslationKey.BUY_TOKENS_SUCCESS,
        user.languageCode,
        { amount },
      );
      await ctx.reply(successMessage);
    }
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
    const [threadId] = await this.userService.getOrCreateThread(
      user.id,
      this.assistantConfig.assistantId,
    );

    try {
      const estimatedTokens = this.estimateTokenUsage(query);
      const userTokens = await this.userService.getTokenBalance(user.id);

      if (userTokens < estimatedTokens) {
        await ctx.answerInlineQuery([
          {
            type: 'article',
            id: '1',
            title: 'Insufficient Tokens',
            input_message_content: {
              message_text:
                'You do not have enough tokens to perform this action.',
            },
          },
        ]);
        return;
      }

      const runAssistantStreamDto: RunAssistantStreamDto = {
        threadId,
        assistantId: this.assistantConfig.assistantId,
        input: {
          messages: [{ role: 'user', content: query }],
        },
        metadata: { languageCode: user.languageCode, userId: user.id },
        config: {},
      };

      const stream = await this.assistantService.runAssistantStream(
        runAssistantStreamDto,
      );

      let fullResponse = '';
      stream.subscribe({
        next: (chunk) => {
          if (chunk.type === MessageType.AGENT_MESSAGE) {
            fullResponse += chunk.data;
          }
        },
        error: async (error) => {
          console.error('Error in stream:', error);
          await ctx.answerInlineQuery([
            {
              type: 'article',
              id: '1',
              title: 'Error',
              input_message_content: {
                message_text:
                  'An error occurred while processing your request.',
              },
            },
          ]);
        },
        complete: async () => {
          const result = [
            {
              type: 'article',
              id: '1',
              title: 'AI Response',
              description: fullResponse.substring(0, 100) + '...',
              input_message_content: {
                message_text: fullResponse,
              },
            },
          ] as const;

          await ctx.answerInlineQuery(result, { cache_time: 0 }); // Disable caching for real-time responses
        },
      });
    } catch (error) {
      console.error('Failed to run assistant stream:', error);
      await ctx.answerInlineQuery([
        {
          type: 'article',
          id: '1',
          title: 'Error',
          input_message_content: {
            message_text: 'An unexpected error occurred.',
          },
        },
      ]);
    }
  }

  @On('message')
  async onMessage(@Ctx() ctx: BotContext) {
    console.debug('onMessage', ctx.message['text']);
    try {
      await this.rateLimiter.consume(ctx.from.id);
    } catch (error) {
      await ctx.reply(
        this.localizationService.translate(
          TranslationKey.RATE_LIMIT_EXCEEDED,
          ctx.from.language_code,
        ),
      );
      return;
    }

    const user = await this.getOrCreateUserFromSession(ctx);

    const message = ctx.message['text'];
    const loadingMessage = this.localizationService.translate(
      TranslationKey.AGENT_THINKING,
      user.languageCode,
    );
    const placeholderMessage = await ctx.reply(loadingMessage);

    this.processMessage(user, message, ctx, placeholderMessage.message_id);
  }

  private async processMessage(
    user: User,
    message: string,
    ctx: BotContext,
    placeholderMessageId: number,
  ): Promise<void> {
    try {
      const estimatedTokens = this.estimateTokenUsage(message);
      const [threadId, userTokens] = await Promise.all([
        this.userService.getOrCreateThread(
          user.id,
          this.assistantConfig.assistantId,
        ),
        this.userService.getTokenBalance(user.id),
      ]);

      if (userTokens < estimatedTokens) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          placeholderMessageId,
          null,
          this.localizationService.translate(
            TranslationKey.INSUFFICIENT_TOKENS,
            user.languageCode,
          ),
        );
        return;
      }

      const runAssistantStreamDto: RunAssistantStreamDto = {
        threadId,
        assistantId: this.assistantConfig.assistantId,
        input: {
          messages: [{ role: 'user', content: message }],
        },
        metadata: { languageCode: user.languageCode },
        config: {},
      };

      const conversationObservable =
        await this.assistantService.runAssistantStream(runAssistantStreamDto);

      await this.streamProcessingService.processStream(
        user,
        conversationObservable,
        ctx,
        placeholderMessageId,
      );
    } catch (error) {
      this.logger.error('Error processing message:', error);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        placeholderMessageId,
        null,
        this.localizationService.translate(
          TranslationKey.ERROR_PROCESSING_MESSAGE,
          user.languageCode,
        ),
      );
    }
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

  private estimateTokenUsage(message: string): number {
    // Implement a more accurate estimation based on your model's specifics
    // This is a simple example and should be adjusted based on your needs
    return Math.ceil(message.length / 4);
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
