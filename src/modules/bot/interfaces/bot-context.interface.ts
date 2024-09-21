import { Context } from 'telegraf';
import { SessionData } from './session-data.interface';

export interface BotContext extends Context {
  session: SessionData;
}
