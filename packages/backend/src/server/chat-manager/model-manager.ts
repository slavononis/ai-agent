import { ChatOpenAI, OpenAIChatModelId } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatDeepSeek } from '../custom-models';
import {
  AnthropicAllowedModels,
  DeepSeekAllowedModels,
  OpenAIAllowedModels,
} from '@monorepo/shared';

export const openAIModels: Record<OpenAIAllowedModels, typeof ChatOpenAI> = {
  'gpt-5': ChatOpenAI,
  'gpt-5-mini': ChatOpenAI,
  'gpt-5-nano': ChatOpenAI,
  'gpt-4': ChatOpenAI,
  'gpt-4o': ChatOpenAI,
  'gpt-4o-mini': ChatOpenAI,
  'gpt-3.5-turbo': ChatOpenAI,
  'codex-mini-latest': ChatOpenAI,
};

export const deepSeekModels: Record<
  DeepSeekAllowedModels,
  typeof ChatDeepSeek
> = {
  'deepseek-chat': ChatDeepSeek,
  'deepseek-reasoner': ChatDeepSeek,
};

export const anthropicModels: Record<
  AnthropicAllowedModels,
  typeof ChatAnthropic
> = {
  'claude-sonnet-4-5-20250929': ChatAnthropic,
  'claude-sonnet-4-20250514': ChatAnthropic,
  'claude-3-7-sonnet-20250219': ChatAnthropic,
  'claude-opus-4-20250514': ChatAnthropic,
  'claude-3-5-haiku-20241022': ChatAnthropic,
};

const allowedModels = {
  ...openAIModels,
  ...deepSeekModels,
  ...anthropicModels,
};
const modelsNOTAllowStreaming: (
  | AnthropicAllowedModels
  | DeepSeekAllowedModels
  | OpenAIAllowedModels
)[] = ['gpt-5', 'gpt-5-mini'];

export class ProviderManager {
  model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels;
  streaming: boolean;
  constructor(
    model:
      | OpenAIAllowedModels
      | AnthropicAllowedModels
      | DeepSeekAllowedModels = 'gpt-4o-mini'
  ) {
    this.model = model;
    this.streaming = !modelsNOTAllowStreaming.includes(model);
  }

  get provider() {
    const Model = allowedModels[this.model];
    return new Model({
      modelName: this.model,
      streaming: this.streaming,
    });
  }
}
