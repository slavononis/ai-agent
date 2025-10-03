import api from '@/utils/axios.client';
import {
  type MessageResponseDTO,
  type MessagesResponseDTO,
} from '@monorepo/shared';

export const getChatDetails = async ({ projectId }: { projectId: string }) => {
  return api
    .get<MessagesResponseDTO>(`/api/conversation/chat/${projectId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const getChatsListRequest = async () => {
  return api
    .get<{ chats: { thread_id: string; ts: string }[] }>(
      '/api/conversation/chats'
    )
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const startChatRequest = async ({ message }: { message: string }) => {
  return api
    .post<MessageResponseDTO>('/api/conversation/chat/start', { message })
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
    .post<MessageResponseDTO>('/api/conversation/chat/continue', {
      thread_id,
      message,
    })
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const deleteChatRequest = async (thread_id: string) => {
  return api
    .delete<{ success: boolean; deleted: string }>(
      `/api/conversation/chat/${thread_id}`
    )
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};
