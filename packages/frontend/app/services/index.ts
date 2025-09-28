import api from '@/utils/axios.client';
import {
  type MessageResponseDTO,
  type MessagesResponseDTO,
} from '@monorepo/shared';

export const getProjectDetails = async ({
  projectId,
}: {
  projectId: string;
}) => {
  return api
    .get<MessagesResponseDTO>(`/api/chat/${projectId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const startChatRequest = async ({ message }: { message: string }) => {
  return api
    .post<MessageResponseDTO>('/api/chat/start', { message })
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const continueChatRequest = async ({
  thread_id,
  message,
}: {
  thread_id: string;
  message: string;
}) => {
  return api
    .post<MessageResponseDTO>('/api/chat/continue', {
      thread_id,
      message,
    })
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};
