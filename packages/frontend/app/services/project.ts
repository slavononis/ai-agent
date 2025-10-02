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
    .get<MessagesResponseDTO>(`/api/project/chat/${projectId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const startProjectRequest = async ({ message }: { message: string }) => {
  return api
    .post<MessageResponseDTO>('/api/project/chat/start', { message })
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const continueProjectRequest = async ({
  thread_id,
  message,
}: {
  thread_id: string;
  message: string;
}) => {
  return api
    .post<MessageResponseDTO>('/api/project/chat/continue', {
      thread_id,
      message,
    })
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};
