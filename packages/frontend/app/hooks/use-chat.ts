import { useNavigate, useParams } from 'react-router';
import { Role, type MessagesResponseDTO } from '@monorepo/shared';
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { Mode } from '@/routes/home';
import { useLLMModel } from '@/store';
import { RoutesPath } from '@/utils/routes.config';
import {
  continueProjectRequest,
  getProjectDetails,
  startProjectRequest,
} from '@/services/project';
import { getChatQueryKey } from '@/components/chat.utils';
import { displayToastError } from '@/helpers/display-toast';
import { setStructuralContent } from '@/utils/chat-formatter';
import { showNotification } from '@/helpers/browser-notification';
import {
  continueChatStream,
  getChatDetails,
  startChatStream,
} from '@/services/conversation';
import { useChatListUpdate } from './use-chats-list';

const useChatDataUpdate = ({ mode }: { mode: Mode }) => {
  const queryClient = useQueryClient();

  return (
    queryKey: string,
    updater: (oldData: MessagesResponseDTO | undefined) => MessagesResponseDTO
  ) => {
    return queryClient.setQueryData<MessagesResponseDTO>(
      getChatQueryKey(queryKey, mode),
      updater
    );
  };
};

export const useChatData = ({ mode }: { mode: Mode }) => {
  const { id } = useParams<{ id: string }>();
  const isChatMode = mode === Mode.Chat;

  return useQuery({
    queryKey: getChatQueryKey(id!, mode),
    queryFn: () =>
      isChatMode
        ? getChatDetails({ projectId: id! })
        : getProjectDetails({ projectId: id! }),
    enabled: (enabled) =>
      isChatMode ? !enabled.state.data?._initialThought && !!id : !!id,
  });
};
export const useNewChatRequest = ({ mode }: { mode: Mode }) => {
  const isChatMode = mode === Mode.Chat;

  const model = useLLMModel((state) => state.model);
  const navigate = useNavigate();
  const updateChatData = useChatDataUpdate({ mode });
  const updateChatsList = useChatListUpdate({ mode });
  const { mutate, isPending, reset } = useMutation({
    mutationKey: getChatQueryKey('new-thread', mode),
    mutationFn: ({ message, files }: { message: string; files?: File[] }) => {
      const tempChatId = `temp-${Date.now().toString()}`;

      return isChatMode
        ? startChatStream({
            model,
            message,
            files,
            onSearchInfo: (chunk) => {
              updateChatData(chunk.thread_id!, (oldData) => {
                return {
                  ...oldData!,
                  searchInfo: chunk.searchInfo,
                };
              });
            },
            onChunk: (chunk) => {
              updateChatData(chunk.thread_id!, (oldData) => {
                if (!oldData) {
                  return {
                    _initialThought: true,
                    thread_id: chunk.thread_id!,
                    messages: [
                      {
                        id: tempChatId,
                        thread_id: chunk.thread_id!,
                        content: files
                          ? setStructuralContent(message, files)
                          : message,
                        role: Role.HumanMessage,
                      },
                    ],
                  };
                }
                // Get the last message (the one being streamed)
                const lastMessage =
                  oldData?.messages?.[oldData.messages.length - 1];

                // If this chunk belongs to the last message, append content
                if (lastMessage && lastMessage.id === chunk.id) {
                  const updatedMessages = [...oldData.messages];
                  updatedMessages[updatedMessages.length - 1] = {
                    ...lastMessage,
                    content: lastMessage.content + chunk.content!,
                  };

                  return {
                    ...oldData,
                    searchInfo: '',
                    messages: updatedMessages,
                    _initialThought: true,
                  };
                }

                // Otherwise, create a new message
                return {
                  ...oldData!,
                  _initialThought: true,
                  messages: [
                    ...(oldData?.messages || []),
                    {
                      id: chunk.id!,
                      thread_id: chunk.thread_id!,
                      content: chunk.content!,
                      role: chunk.role!,
                    },
                  ],
                };
              });
            },
            onThreadId: (threadId) => {
              updateChatData(threadId!, (oldData) => {
                if (!oldData) {
                  return {
                    _initialThought: true,
                    thread_id: threadId as string,
                    messages: [
                      {
                        id: tempChatId,
                        thread_id: threadId!,
                        content: files
                          ? setStructuralContent(message, files)
                          : message,
                        role: Role.HumanMessage,
                      },
                    ],
                  };
                }

                return oldData;
              });
              navigate(RoutesPath.Chat.replace(':id', threadId));
            },
            onError: (error) => {
              reset();
              updateChatData(error.thread_id!, (oldData) => {
                return {
                  ...(oldData! || {}),
                  _initialThought: false,
                };
              });
              displayToastError(
                error.error || 'Failed to send message. Please try again.'
              );
            },
            onComplete: (data) => {
              showNotification('Answer From chat is ready.');
              updateChatData(data.thread_id!, (oldData) => {
                return {
                  ...(oldData! || {}),
                  chat_name: data.chat_name,
                  _initialThought: false,
                  searchInfo: '',
                };
              });
              updateChatsList((oldData) => {
                return {
                  ...(oldData! || {}),
                  chats: (oldData?.chats || []).map((chat) => {
                    if (chat.thread_id === data.thread_id) {
                      return {
                        ...chat,
                        chat_name: data.chat_name!,
                      };
                    }
                    return chat;
                  }),
                };
              });
            },
          })
        : startProjectRequest({ message, files, model });
    },
    onSuccess: (data, vars) => {
      if (!data) return;
      showNotification('Answer From chat is ready.');
      const tempChatId = `temp-${Date.now().toString()}`;
      updateChatData(data.thread_id!, (oldData) => {
        return {
          chat_name: data.chat_name,
          thread_id: data.thread_id!,
          messages: [
            ...(oldData?.messages || []),
            {
              id: tempChatId,
              thread_id: data.thread_id!,
              content: vars.files
                ? setStructuralContent(vars.message, vars.files)
                : vars.message,
              role: Role.HumanMessage,
            },
            data,
          ],
        };
      });
      updateChatsList((oldData) => {
        return {
          ...(oldData! || {}),
          chats: (oldData?.chats || []).map((chat) => {
            if (chat.thread_id === data.thread_id) {
              return {
                ...chat,
                chat_name: data.chat_name!,
              };
            }
            return chat;
          }),
        };
      });
      navigate(
        (isChatMode ? RoutesPath.Chat : RoutesPath.Project).replace(
          ':id',
          data.thread_id
        )
      );
    },
    onError: (error) => {
      displayToastError('Failed to start chat. Please try again.');
    },
  });
  return {
    mutate,
    isPending,
  };
};

export const useUpdateChatRequest = ({ mode }: { mode: Mode }) => {
  const isChatMode = mode === Mode.Chat;
  const model = useLLMModel((state) => state.model);
  const { id } = useParams<{ id: string }>();
  const updateChatData = useChatDataUpdate({ mode });

  return useMutation({
    mutationKey: getChatQueryKey(id!, mode),
    mutationFn: ({ message, files }: { message: string; files?: File[] }) => {
      const tempChatId = `temp-${Date.now().toString()}`;
      updateChatData(id!, (oldData) => ({
        ...oldData,
        thread_id: id!,
        messages: [
          ...(oldData?.messages || []),
          {
            id: tempChatId,
            thread_id: id!,
            content: files ? setStructuralContent(message, files) : message,
            role: Role.HumanMessage,
          },
        ],
      }));
      // scrollToBottom();
      return isChatMode
        ? continueChatStream({
            message,
            model,
            files,
            threadId: id!,
            onComplete: (chunk) => {
              showNotification('Answer From chat is ready.');
              updateChatData(chunk.thread_id!, (oldData) => {
                return {
                  ...oldData!,
                  searchInfo: '',
                };
              });
            },
            onSearchInfo: (chunk) => {
              updateChatData(chunk.thread_id!, (oldData) => {
                return {
                  ...oldData!,
                  searchInfo: chunk.searchInfo,
                };
              });
            },
            onChunk: (chunk) => {
              updateChatData(id!, (oldData) => {
                const lastMessage =
                  oldData?.messages?.[oldData.messages.length - 1];
                if (lastMessage && lastMessage.id === chunk.id) {
                  const updated = [...oldData.messages];
                  updated[updated.length - 1] = {
                    ...lastMessage,
                    content: lastMessage.content + chunk.content!,
                  };
                  return { ...oldData, messages: updated };
                }
                return {
                  ...oldData!,
                  searchInfo: '',
                  messages: [
                    ...(oldData?.messages || []),
                    {
                      id: chunk.id!,
                      thread_id: chunk.thread_id!,
                      content: chunk.content!,
                      role: chunk.role!,
                    },
                  ],
                };
              });
            },
            onError: (error) => {
              displayToastError(
                error.error || 'Failed to send message. Please try again.'
              );
              updateChatData(id!, (oldData) => ({
                thread_id: id!,
                messages: (oldData?.messages || []).filter(
                  (msg) => !msg.id.startsWith('temp-')
                ),
              }));
            },
          })
        : continueProjectRequest({ message, thread_id: id!, files, model });
    },
    onSuccess: (data) => {
      if (!data) return;
      showNotification('Answer From chat is ready.');

      updateChatData(id!, (oldData) => ({
        thread_id: id!,
        messages: [...(oldData?.messages || []), data],
      }));
      // if (autoScrollEnabled && !isUserScrolling) scrollToBottom();
    },
    onError: () => {
      displayToastError('Failed to send message. Please try again.');
      updateChatData(id!, (oldData) => ({
        thread_id: id!,
        messages: (oldData?.messages || []).filter(
          (msg) => !msg.id.startsWith('temp-')
        ),
      }));
    },
  });
};

export const useChatMutationState = ({ mode }: { mode: Mode }) => {
  const { id } = useParams<{ id: string }>();

  return useMutationState({
    filters: {
      exact: true,
      predicate: (m) => {
        const base =
          m?.options.mutationKey?.[0] === getChatQueryKey(id!, mode)[0];
        const type =
          m?.options.mutationKey?.[0] === getChatQueryKey(id!, mode)[0];
        return base && type;
      },
      status: 'pending',
    },
    select: (data) => {
      return {
        id: data?.options.mutationKey?.[2],
        isPending: data?.state.status === 'pending',
      };
    },
  });
};
