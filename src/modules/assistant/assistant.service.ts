import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CreateAssistantDto,
  CreateThreadDto,
  GetThreadStateDto,
  RunAssistantDto,
  UpdateAssistantDto,
  UpdateThreadStateDto,
} from './dto';

@Injectable()
export class AssistantService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('assistant').baseUrl;
  }

  async createAssistant({ graph_id, config, metadata }: CreateAssistantDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/assistants`,
        {
          graph_id,
          config,
          metadata,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
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
      this.httpService.patch(`${this.baseUrl}/assistants/${assistantId}`, {
        graph_id,
        config,
        metadata,
      }),
    );
    return response.data;
  }

  async createThread({ assistantId, metadata }: CreateThreadDto) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/threads`,
        {
          assistant_id: assistantId,
          metadata,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
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
          `${this.baseUrl}/threads/${threadId}/runs/wait`,
          {
            assistant_id: assistantId,
            input,
            metadata,
            config,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      console.error('Error running assistant:', error);
      throw new Error('Failed to run assistant');
    }
  }

  async getAssistant(assistantId: string) {
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/assistants/${assistantId}`),
    );
    return response.data;
  }

  async getThreadState({ threadId }: GetThreadStateDto) {
    console.debug(
      'getThreadState',
      threadId,
      `${this.baseUrl}/threads/${threadId}/state`,
    );
    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/threads/${threadId}/state`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }),
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
        `${this.baseUrl}/threads/${threadId}/state`,
        {
          values,
          checkpoint_id,
          as_node,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    return response.data;
  }
}
