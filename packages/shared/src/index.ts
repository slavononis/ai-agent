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
