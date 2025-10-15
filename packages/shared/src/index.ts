import { ChatOpenAI, OpenAIClient } from '@langchain/openai';
import { ChatAnthropic, AnthropicMessagesModelId } from '@langchain/anthropic';

export enum Role {
  HumanMessage = 'HumanMessage',
  AIMessage = 'AIMessage',
  AIMessageChunk = 'AIMessageChunk',
  ToolMessage = 'ToolMessage',
}

export interface ChatMetadata {
  thread_id: string;
  chat_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface MessageModelDTO {
  lc: number;
  type: 'constructor';
  id: [string, string, Role];
  kwargs: Kwargs;
}
export interface StructuredContent {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  filename?: string;
  image_url?: ImageUrl;
}

export interface ImageUrl {
  url: string;
}

export interface MessageResponseDTO {
  id: string;
  chat_name?: string;
  thread_id: string;
  content: string | StructuredContent[];
  role: Role;
  structuredData?: {
    kwargs?: Kwargs;
  };
}

export interface MessagesResponseDTO {
  _initialThought?: boolean;
  searchInfo?: string;
  thread_id: string;
  chat_name?: string;
  messages: MessageResponseDTO[];
}

export interface Kwargs {
  content: string;
  additional_kwargs: Additionalkwargs;
  response_metadata: Responsemetadata;
  id: string;
  tool_calls: any[];
  invalid_tool_calls: any[];
  usage_metadata: Usagemetadata;
}

export interface Usagemetadata {
  output_tokens: number;
  input_tokens: number;
  total_tokens: number;
  input_token_details: Inputtokendetails;
  output_token_details: Outputtokendetails;
}

export interface Outputtokendetails {
  audio: number;
  reasoning: number;
}

export interface Inputtokendetails {
  audio: number;
  cache_read: number;
}

export interface Responsemetadata {
  tokenUsage: TokenUsage;
  finish_reason: string;
  model_name: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Additionalkwargs {}

export type AIProvider = 'openai' | 'anthropic' | 'deepseek';

export type OpenAIAllowedModels = Extract<
  OpenAIClient.ChatModel,
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'gpt-4'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-3.5-turbo'
>;

export type DeepSeekAllowedModels = 'deepseek-chat' | 'deepseek-reasoner';

export type AnthropicAllowedModels =
  | Extract<
      AnthropicMessagesModelId,
      | 'claude-sonnet-4-5-20250929'
      | 'claude-sonnet-4-20250514'
      | 'claude-3-7-sonnet-20250219'
      | 'claude-opus-4-20250514'
      | 'claude-3-5-haiku-20241022'
    >
  | 'claude-sonnet-4-5-20250929';
export type AllowedModels = OpenAIAllowedModels | DeepSeekAllowedModels;
