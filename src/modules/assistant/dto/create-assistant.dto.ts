export class CreateAssistantDto {
  graph_id: string;
  config: {
    tags: string[];
    recursion_limit: number;
    configurable: {
      type: string;
      'type==agent/agent_type': string;
      'type==agent/interrupt_before_action': boolean;
      'type==agent/retrieval_description': string;
      'type==agent/system_message': string;
      'type==agent/tools': any[];
      'type==chat_retrieval/llm_type': string;
      'type==chat_retrieval/system_message': string;
      'type==chatbot/llm_type': string;
      'type==chatbot/system_message': string;
    };
  };
  metadata: any;
}
