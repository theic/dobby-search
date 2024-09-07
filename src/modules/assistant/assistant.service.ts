import { AssistantConfig } from '@config/assistant.config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigType } from '@shared/enum';
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
      this.logger.error(error);
      throw new Error('Failed to run assistant');
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
