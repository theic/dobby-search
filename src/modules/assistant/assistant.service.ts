import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import {
  CreateAssistantDto,
  CreateThreadDto,
  GetThreadStateDto,
  RunAssistantDto,
  UpdateAssistantDto,
} from './dto';

@Injectable()
export class AssistantService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('opengpts').baseUrl;
  }

  async createAssistant({ name, config, userId }: CreateAssistantDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/assistants`,
        {
          name,
          config,
          public: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userId}`,
          },
        },
      ),
    );
    return response.data;
  }

  async updateAssistant({ assistantId, name, config }: UpdateAssistantDto) {
    const response = await firstValueFrom(
      this.httpService.put(`${this.baseUrl}/assistants/${assistantId}`, {
        name,
        config,
      }),
    );
    return response.data;
  }

  async createThread({ assistantId, name, userId }: CreateThreadDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/threads`,
        {
          name,
          assistant_id: assistantId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userId}`,
          },
        },
      ),
    );
    return response.data;
  }

  async runAssistant({ threadId, userId, messages }: RunAssistantDto) {
    console.debug('runAssistant', threadId, { messages });
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/runs`,
        {
          thread_id: threadId,
          input: messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userId}`,
          },
        },
      ),
    );
    return response.data;
  }

  async runAssistantStream({ threadId, messages }: RunAssistantDto) {
    const response = await lastValueFrom(
      this.httpService.post(`${this.baseUrl}/runs/stream`, {
        thread_id: threadId,
        input: messages,
      }),
    );
    return response.data;
  }

  async getThreadState({ threadId, userId }: GetThreadStateDto) {
    console.debug(
      'getThreadState',
      threadId,
      `${this.baseUrl}/threads/${threadId}/state`,
    );
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/threads/${threadId}/state`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
      }),
    );
    return response.data;
  }
}
