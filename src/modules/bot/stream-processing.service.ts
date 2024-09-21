import { LocalizationService } from '@modules/localization/localization.service';
import { User } from '@modules/user/user.model';
import { UserService } from '@modules/user/user.service';
import { Injectable, Logger } from '@nestjs/common';
import { TranslationKey } from '@shared/enum/translation-keys.enum';
import { Observable } from 'rxjs';
import { Context } from 'telegraf';
import { MessageType } from '../assistant/enums/message-type.enum';
import { TokenUsage } from '../assistant/interfaces/token-usage.interface';

@Injectable()
export class StreamProcessingService {
  private readonly logger = new Logger(StreamProcessingService.name);
  private tokenUsage: TokenUsage | undefined;

  constructor(
    private readonly localizationService: LocalizationService,
    private readonly userService: UserService,
  ) {}

  async processStream(
    user: User,
    conversationObservable: Observable<any>,
    ctx: Context,
    placeholderMessageId: number,
  ): Promise<void> {
    const responseMessage = '';
    const lastSentMessage = '';
    this.tokenUsage = undefined;

    conversationObservable.subscribe({
      next: (update) =>
        this.handleStreamUpdate(
          update,
          ctx,
          placeholderMessageId,
          responseMessage,
          lastSentMessage,
          user.languageCode,
        ),
      complete: () => this.handleStreamComplete(user, responseMessage),
      error: (error) =>
        this.handleStreamError(
          error,
          ctx,
          placeholderMessageId,
          user.languageCode,
        ),
    });
  }

  private handleStreamUpdate(
    update: any,
    ctx: Context,
    placeholderMessageId: number,
    responseMessage: string,
    lastSentMessage: string,
    languageCode: string,
  ): void {
    if (update.type === MessageType.AGENT_MESSAGE) {
      responseMessage += update.data;
      this.updateTelegramMessage(
        ctx,
        placeholderMessageId,
        responseMessage,
        lastSentMessage,
      );
    } else if (update.type === MessageType.TOOL_MESSAGE) {
      this.sendToolMessage(
        ctx,
        placeholderMessageId,
        TranslationKey.TOOL_ANSWER_RECEIVED,
        languageCode,
      );
    } else if (update.type === MessageType.TOOL_CALL) {
      this.sendToolMessage(
        ctx,
        placeholderMessageId,
        TranslationKey.TOOL_CALL_INITIATED,
        languageCode,
      );
    } else if (update.type === MessageType.TOKEN_USAGE) {
      this.tokenUsage = update.data;
      this.logger.debug(
        `Token usage received: ${JSON.stringify(this.tokenUsage)}`,
      );
    }
  }

  private updateTelegramMessage(
    ctx: Context,
    placeholderMessageId: number,
    responseMessage: string,
    lastSentMessage: string,
  ): void {
    if (responseMessage !== lastSentMessage) {
      ctx.telegram
        .editMessageText(
          ctx.chat.id,
          placeholderMessageId,
          null,
          responseMessage,
          { parse_mode: 'Markdown' },
        )
        .catch((error) => {
          if (error.description !== 'Bad Request: message is not modified') {
            this.logger.error('Error updating message:', error);
          }
        });
      lastSentMessage = responseMessage;
    }
  }

  private sendToolMessage(
    ctx: Context,
    placeholderMessageId: number,
    translationKey: TranslationKey,
    languageCode: string,
  ): void {
    const message = this.localizationService.translate(
      translationKey,
      languageCode,
    );
    ctx.telegram.editMessageText(
      ctx.chat.id,
      placeholderMessageId,
      null,
      message,
      { parse_mode: 'Markdown' },
    );
  }

  private async handleStreamComplete(
    user: User,
    responseMessage: string,
  ): Promise<void> {
    const tokensToSpend =
      this.tokenUsage?.totalTokens ??
      this.calculateActualTokenUsage(responseMessage);
    this.logger.debug(`Tokens to spend: ${tokensToSpend}`);
    await this.userService.spendTokens(
      user.id,
      tokensToSpend,
      'Message processing',
    );
    this.logger.debug(`Tokens spent for user ${user.id}: ${tokensToSpend}`);
  }

  private handleStreamError(
    error: any,
    ctx: Context,
    placeholderMessageId: number,
    languageCode: string,
  ): void {
    this.logger.error('Error in assistant stream:', error);
    ctx.telegram.editMessageText(
      ctx.chat.id,
      placeholderMessageId,
      null,
      this.localizationService.translate(
        TranslationKey.ERROR_PROCESSING_MESSAGE,
        languageCode,
      ),
    );
  }

  private calculateActualTokenUsage(responseMessage: string): number {
    // Implement a more accurate calculation based on your model's specifics
    const calculatedTokens = Math.ceil(responseMessage.length / 4);
    this.logger.debug(`Calculated tokens: ${calculatedTokens}`);
    return calculatedTokens;
  }
}
