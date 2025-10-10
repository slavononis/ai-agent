import { BaseChatOpenAIFields, ChatOpenAI } from '@langchain/openai';

export class ChatDeepSeek extends ChatOpenAI {
  constructor(options?: BaseChatOpenAIFields) {
    super({
      model: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
      ...options,
      configuration: {
        ...options?.configuration,
        baseURL: 'https://api.deepseek.com/v1',
      },
    });
  }
}
