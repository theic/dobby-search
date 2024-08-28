import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CreateAssistantDto,
  CreateThreadDto,
  GetThreadStateDto,
  RunAssistantDto,
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
          public: true,
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

  // async addMessage(threadId: string, content: string, userId: string) {
  //   const response = await firstValueFrom(
  //     this.httpService.post(
  //       `${this.baseUrl}/threads/${threadId}/state`,
  //       {
  //         values: [
  //           {
  //             content,
  //             type: 'human',
  //           },
  //         ],
  //       },
  //       {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: `Bearer ${userId}`,
  //         },
  //       },
  //     ),
  //   );
  //   return response.data;
  // }

  async runAssistant({ threadId, userId, messages }: RunAssistantDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/runs`,
        {
          thread_id: threadId,
          input: {
            messages,
          },
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

  async getThreadState({ threadId, userId }: GetThreadStateDto) {
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
