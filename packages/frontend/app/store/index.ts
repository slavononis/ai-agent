import type {
  AnthropicAllowedModels,
  DeepSeekAllowedModels,
  OpenAIAllowedModels,
} from '@monorepo/shared';
import { create } from 'zustand';

type StoreState = {
  model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels;
  setModel: (
    model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels
  ) => void;
};

export const useLLMModel = create<StoreState>((set) => ({
  model: 'gpt-5-nano',
  setModel: (model) => set({ model }),
}));
