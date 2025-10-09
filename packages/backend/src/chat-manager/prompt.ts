import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

export const chatPromptTemplate = ChatPromptTemplate.fromMessages([
  {
    role: 'system',
    content:
      'You are a helpful assistant. Response must be in markdown format, use all abilities of markdown to show more structured content.',
  },
  new MessagesPlaceholder('messages'),
]);
