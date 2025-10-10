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

export const startProjectRequest = async ({
  message,
  files,
}: {
  message: string;
  files?: File[];
}) => {
  const formData = new FormData();
  formData.append('message', message);
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
}: {
  thread_id: string;
  message: string;
  files?: File[];
}) => {
  const formData = new FormData();
  formData.append('thread_id', thread_id);
  formData.append('message', message);
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
