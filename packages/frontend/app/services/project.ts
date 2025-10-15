import api from '@/utils/axios.client';
import {
  type AnthropicAllowedModels,
  type DeepSeekAllowedModels,
  type MessageResponseDTO,
  type MessagesResponseDTO,
  type OpenAIAllowedModels,
} from '@monorepo/shared';
import type { ChatListItem } from './conversation';

export const getProjectsListRequest = async () => {
  return api
    .get<{ chats: ChatListItem[] }>('/api/project/chats')
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

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

export const startProjectRequest = async ({
  message,
  files,
  model,
}: {
  message: string;
  files?: File[];
  model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels;
}) => {
  const formData = new FormData();
  formData.append('message', message);
  formData.append('model', model);
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append('file', file);
    });
  }
  return api
    .post<MessageResponseDTO>('/api/project/chat/start', formData)
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const continueProjectRequest = async ({
  thread_id,
  message,
  files,
  model,
}: {
  thread_id: string;
  message: string;
  files?: File[];
  model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels;
}) => {
  const formData = new FormData();
  formData.append('thread_id', thread_id);
  formData.append('message', message);
  formData.append('model', model);
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append('file', file);
    });
  }
  return api
    .post<MessageResponseDTO>('/api/project/chat/continue', formData)
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export const deleteProjectRequest = async (thread_id: string) => {
  return api
    .delete<{ success: boolean; deleted: string }>(
      `/api/project/chat/${thread_id}`
    )
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};
