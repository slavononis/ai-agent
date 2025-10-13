import api from '@/utils/axios.client';
import {
  Role,
  type AnthropicAllowedModels,
  type DeepSeekAllowedModels,
  type MessageResponseDTO,
  type MessagesResponseDTO,
  type OpenAIAllowedModels,
} from '@monorepo/shared';

export const getChatDetails = async ({ projectId }: { projectId: string }) => {
  return api
    .get<MessagesResponseDTO>(`/api/conversation/chat/${projectId}`)
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

export interface ChatListItem {
  thread_id: string;
  chat_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}
export const getChatsListRequest = async () => {
  return api
    .get<{ chats: ChatListItem[] }>('/api/conversation/chats')
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

interface StreamChunk {
  type: 'thread_id' | 'chunk' | 'done' | 'error';
  thread_id?: string;
  content?: string;
  role?: Role;
  id?: string;
  chat_name?: string;
  error?: string;
  searchInfo?: string;
}

/**
 * Start a new chat with streaming
 */
export async function startChatStream({
  message,
  files,
  model,
  onChunk,
  onThreadId,
  onError,
  onComplete,
  onSearchInfo,
}: {
  model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels;
  message: string;
  files?: File[];
  onChunk: (data: StreamChunk) => void;
  onThreadId?: (threadId: string) => void;
  onSearchInfo?: (data: StreamChunk) => void;
  onError?: (error: string) => void;
  onComplete?: (data: StreamChunk) => void;
}): Promise<MessageResponseDTO | null> {
  try {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('model', model);
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('file', file);
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
                if (data.role === Role.ToolMessage) {
                  onSearchInfo?.(data);
                }
                if (data.content) {
                  onChunk(data);
                }
                break;
              case 'done':
                if (onComplete && data.thread_id) {
                  onComplete(data);
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
  files,
  model,
  onChunk,
  onError,
  onComplete,
  onSearchInfo,
}: {
  threadId: string;
  message: string;
  files?: File[];
  model: OpenAIAllowedModels | AnthropicAllowedModels | DeepSeekAllowedModels;
  onChunk: (data: StreamChunk) => void;
  onSearchInfo?: (data: StreamChunk) => void;
  onError?: (error: string) => void;
  onComplete?: (data: StreamChunk) => void;
}): Promise<MessageResponseDTO | null> {
  try {
    const formData = new FormData();
    formData.append('thread_id', threadId);
    formData.append('message', message);
    formData.append('model', model);
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('file', file);
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
                if (data.role === Role.ToolMessage) {
                  onSearchInfo?.(data);
                }
                if (data.content) {
                  onChunk(data);
                }
                break;
              case 'done':
                if (onComplete) {
                  onComplete(data);
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
