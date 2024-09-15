import { AssistantConfig } from '@config/assistant.config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
import axios from 'axios';
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { Readable } from 'stream';
import {
  CreateAssistantDto,
  CreateThreadDto,
  GetThreadStateDto,
  RunAssistantDto,
  RunAssistantStreamDto,
  UpdateAssistantDto,
  UpdateThreadStateDto,
} from './dto';
import { MessageType } from './enums/message-type.enum';

@Injectable()
export class AssistantService {
  private readonly assistantConfig: AssistantConfig;
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.assistantConfig = this.configService.get(ConfigType.ASSISTANT);
  }

  async createAssistant({ graph_id, config, metadata }: CreateAssistantDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.assistantConfig.baseUrl}/assistants`,
        { graph_id, config, metadata },
        {
          headers: this.getHeaders(),
        },
      ),
    );
    return response.data;
  }

  async updateAssistant({
    assistantId,
    graph_id,
    config,
    metadata,
  }: UpdateAssistantDto) {
    const response = await firstValueFrom(
      this.httpService.patch(
        `${this.assistantConfig.baseUrl}/assistants/${assistantId}`,
        { graph_id, config, metadata },
        {
          headers: this.getHeaders(),
        },
      ),
    );
    return response.data;
  }

  async createThread({ assistantId, metadata }: CreateThreadDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.assistantConfig.baseUrl}/threads`,
        { assistant_id: assistantId, metadata },
        {
          headers: this.getHeaders(),
        },
      ),
    );
    return response.data;
  }

  async runAssistant({
    threadId,
    assistantId,
    input,
    metadata,
    config,
  }: RunAssistantDto) {
    console.debug('runAssistant', threadId, { input });
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.assistantConfig.baseUrl}/threads/${threadId}/runs/wait`,
          { assistant_id: assistantId, input, metadata, config },
          {
            headers: this.getHeaders(),
          },
        ),
      );
      return response.data;
    } catch (error) {
      Logger.error(error);
      throw new Error('Failed to run assistant');
    }
  }

  async runAssistantStream({
    threadId,
    assistantId,
    input,
    metadata,
    config,
    stream_mode,
  }: RunAssistantStreamDto): Promise<Observable<any>> {
    const url = `${this.assistantConfig.baseUrl}/threads/${threadId}/runs/stream`;
    const subject = new Subject<any>();

    try {
      const response = await axios({
        method: 'post',
        url,
        data: {
          assistant_id: assistantId,
          input,
          metadata,
          config,
          stream_mode,
        },
        headers: this.getHeaders(),
        responseType: 'stream',
      });

      const stream = response.data as Readable;

      stream.on('data', (chunk) => {
        const events = chunk.toString().split('\n\n').filter(Boolean);
        events.forEach((event) => this.processEvent(event, subject));
      });

      stream.on('end', () => {
        this.logger.log('Stream ended.');
        subject.complete();
      });

      stream.on('error', (error) => {
        this.logger.error('Stream error:', error.message);
        subject.error(error);
      });
    } catch (error) {
      this.logger.error('Error during stream:', error.message);
      subject.error(error);
    }

    return subject.asObservable();
  }

  private processEvent(event: string, subject: Subject<any>) {
    const lines = event.split('\n');
    const eventType =
      lines
        .find((line) => line.startsWith('event:'))
        ?.replace('event: ', '')
        .trim() || '';
    const eventDataString =
      lines
        .find((line) => line.startsWith('data:'))
        ?.replace('data: ', '')
        .trim() || '';

    let eventData: any = null;
    try {
      eventData = eventDataString && JSON.parse(eventDataString);
    } catch (error) {
      this.logger.error('Error parsing event data:', eventDataString);
    }

    if (eventType && eventData) {
      this.handleEventData(eventType, eventData, subject);
    }
  }

  private handleEventData(
    eventType: string,
    eventData: any,
    subject: Subject<any>,
  ) {
    switch (eventType) {
      case 'metadata':
        this.logger.log(`Metadata received: ${JSON.stringify(eventData)}`);
        break;
      case 'updates':
        this.logger.log(`Update received: ${JSON.stringify(eventData)}`);
        this.processUpdate(eventData, subject);
        break;
      case 'heartbeat':
        this.logger.log('Heartbeat received');
        break;
      default:
        this.logger.log(`Unknown event type: ${eventType}`);
    }
  }

  private processUpdate(data: any, subject: Subject<any>) {
    if (data.agent?.messages) {
      data.agent.messages.forEach((message) => {
        if (message.content) {
          subject.next({
            type: MessageType.AGENT_MESSAGE,
            data: message.content,
          });
        }
        if (message.tool_calls) {
          message.tool_calls.forEach((toolCall) => {
            subject.next({ type: MessageType.TOOL_CALL, data: toolCall });
          });
        }
      });
    }

    if (data.tools?.messages) {
      data.tools.messages.forEach((message) => {
        subject.next({ type: MessageType.TOOL_MESSAGE, data: message.content });
      });
    }
  }

  async getAssistant(assistantId: string) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.assistantConfig.baseUrl}/assistants/${assistantId}`,
        {
          headers: this.getHeaders(),
        },
      ),
    );
    return response.data;
  }

  async getThreadState({ threadId }: GetThreadStateDto) {
    console.debug(
      'getThreadState',
      threadId,
      `${this.assistantConfig.baseUrl}/threads/${threadId}/state`,
    );
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.assistantConfig.baseUrl}/threads/${threadId}/state`,
        {
          headers: this.getHeaders(),
        },
      ),
    );
    return response.data;
  }

  async updateThreadState({
    threadId,
    values,
    checkpoint_id,
    as_node,
  }: UpdateThreadStateDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.assistantConfig.baseUrl}/threads/${threadId}/state`,
        { values, checkpoint_id, as_node },
        {
          headers: this.getHeaders(),
        },
      ),
    );
    return response.data;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.assistantConfig.apiKey,
    };
  }
}
