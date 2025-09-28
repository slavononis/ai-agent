export enum Role {
  HumanMessage = 'HumanMessage',
  AIMessage = 'AIMessage',
}
export interface MessageModelDTO {
  lc: number;
  type: 'constructor';
  id: [string, string, Role];
  kwargs: Kwargs;
}

export interface MessageResponseDTO {
  id: string;
  thread_id: string;
  content: string;
  role: Role;
  structuredData: any;
}

export interface MessagesResponseDTO {
  thread_id: string;
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
