import api from '@/utils/axios.client';
import {
  Role,
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

export const startChatRequest = async ({
  message,
  images,
}: {
  message: string;
  images?: File[];
}) => {
  if (images && images.length > 0) {
    const formData = new FormData();
    formData.append('message', message);
    images.forEach((image) => {
      formData.append('image', image);
    });
    return api
      .post<MessageResponseDTO>('/api/conversation/chat/start', formData)
      .then((res) => res.data)
      .catch((err) => {
        throw err;
      });
  } else {
    return api
      .post<MessageResponseDTO>('/api/conversation/chat/start', { message })
      .then((res) => res.data)
      .catch((err) => {
        throw err;
      });
  }
};

export const continueChatRequest = async ({
  thread_id,
  message,
  images,
}: {
  thread_id: string;
  message: string;
  images?: File[];
}) => {
  if (images && images.length > 0) {
    const formData = new FormData();
    formData.append('thread_id', thread_id);
    formData.append('message', message);
    images.forEach((image) => {
      formData.append('image', image);
    });
    return api
      .post<MessageResponseDTO>('/api/conversation/chat/continue', formData)
      .then((res) => res.data)
      .catch((err) => {
        throw err;
      });
  } else {
    return api
      .post<MessageResponseDTO>('/api/conversation/chat/continue', {
        thread_id,
        message,
      })
      .then((res) => res.data)
      .catch((err) => {
        throw err;
      });
  }
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

interface StreamChunk {
  type: 'thread_id' | 'chunk' | 'done' | 'error';
  thread_id?: string;
  content?: string;
  role?: Role;
  id?: string;
  error?: string;
}

/**
 * Start a new chat with streaming
 */
export async function startChatStream({
  message,
  images,
  onChunk,
  onThreadId,
  onError,
  onComplete,
}: {
  message: string;
  images?: File[];
  onChunk: (data: StreamChunk) => void;
  onThreadId?: (threadId: string) => void;
  onError?: (error: string) => void;
  onComplete?: (thread_id: string) => void;
}): Promise<MessageResponseDTO | null> {
  try {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('stream', 'true');
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append('image', image);
      });
    }

    const response = await api.post('/api/conversation/chat/start', formData, {
      responseType: 'stream',
      adapter: 'fetch', // Use fetch adapter for better streaming support
    });

    // For browser environment, response.data is a ReadableStream
    const reader = response.data.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: StreamChunk = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'thread_id':
                if (data.thread_id && onThreadId) {
                  onThreadId(data.thread_id);
                }
                break;
              case 'chunk':
                if (data.content) {
                  onChunk(data);
                }
                break;
              case 'done':
                if (onComplete && data.thread_id) {
                  onComplete(data.thread_id);
                }
                break;
              case 'error':
                if (onError) {
                  onError(data.error || 'Unknown error');
                }
                break;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    return null;
  } catch (error: any) {
    if (onError) {
      onError(error.message || 'Network error');
    }
    throw error;
  }
}

/**
 * Continue an existing chat with streaming
 */
export async function continueChatStream({
  threadId,
  message,
  images,
  onChunk,
  onError,
  onComplete,
}: {
  threadId: string;
  message: string;
  images?: File[];
  onChunk: (data: StreamChunk) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}): Promise<MessageResponseDTO | null> {
  try {
    const formData = new FormData();
    formData.append('thread_id', threadId);
    formData.append('message', message);
    formData.append('stream', 'true');
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append('image', image);
      });
    }

    const response = await api.post(
      '/api/conversation/chat/continue',
      formData,
      {
        responseType: 'stream',
        adapter: 'fetch',
      }
    );

    const reader = response.data.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: StreamChunk = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'chunk':
                if (data.content) {
                  onChunk(data);
                }
                break;
              case 'done':
                if (onComplete) {
                  onComplete();
                }
                break;
              case 'error':
                if (onError) {
                  onError(data.error || 'Unknown error');
                }
                break;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    return null;
  } catch (error: any) {
    if (onError) {
      onError(error.message || 'Network error');
    }
    throw error;
  }
}
