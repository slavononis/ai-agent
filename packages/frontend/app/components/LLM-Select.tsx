import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLLMModel } from '@/store';
import type {
  AnthropicAllowedModels,
  DeepSeekAllowedModels,
  OpenAIAllowedModels,
} from '@monorepo/shared';

const models: (
  | OpenAIAllowedModels
  | AnthropicAllowedModels
  | DeepSeekAllowedModels
)[] = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-opus-4-20250514',
  'claude-3-5-haiku-20241022',
  'deepseek-chat',
  'deepseek-reasoner',
];
export function LLMSelect() {
  const options = models.map((model) => ({
    value: model,
    label: model,
  }));
  const model = useLLMModel((state) => state.model);
  const setModel = useLLMModel((state) => state.setModel);
  return (
    <Select
      value={model}
      onValueChange={(value: typeof model) => setModel(value)}
    >
      <SelectTrigger className="w-[120px] rounded-full bg-background">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Models</SelectLabel>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
