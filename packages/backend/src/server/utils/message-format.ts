import { MessageResponseDTO } from '@monorepo/shared';

export const getFormattedMessage = (
  msg: any,
  thread_id: string
): MessageResponseDTO => {
  return {
    id: msg.kwargs.id,
    thread_id,
    content: msg.kwargs.content,
    role: msg.id[2],
    structuredData: msg.kwargs,
  };
};
