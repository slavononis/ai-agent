import { ChatInput } from '@/components/chat-input';
import type { Route } from './+types/home';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { startProjectRequest } from '@/services/project';
import { RoutesPath } from '@/utils/routes.config';
import { displayToastError } from '@/helpers/display-toast';
import { Role, type MessagesResponseDTO } from '@monorepo/shared';
import { getChatQueryKey } from '@/components/chat.utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { startChatStream, type ChatListItem } from '@/services/conversation';
import { setStructuralContent } from '@/utils/chat-formatter';
import { useLLMModel } from '@/store';
import { showNotification } from '@/helpers/browser-notification';
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export enum Mode {
  Chat = 'Chat',
  Code = 'Code',
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(Mode.Chat);
  const model = useLLMModel((state) => state.model);

  const isChatMode = mode === Mode.Chat;
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
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(chunk.thread_id!, mode),
                (oldData) => {
                  return {
                    ...oldData!,
                    searchInfo: chunk.searchInfo,
                  };
                }
              );
            },
            onChunk: (chunk) => {
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(chunk.thread_id!, mode),
                (oldData) => {
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
                }
              );
            },
            onThreadId: (threadId) => {
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(threadId!, mode),
                (oldData) => {
                  if (!oldData) {
                    return {
                      _initialThought: true,
                      thread_id: threadId!,
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
                }
              );
              navigate(RoutesPath.Chat.replace(':id', threadId));
            },
            onError: (error) => {
              reset();
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(error.thread_id!, mode),
                (oldData) => {
                  return {
                    ...(oldData! || {}),

                    _initialThought: false,
                  };
                }
              );
              displayToastError(
                error.error || 'Failed to send message. Please try again.'
              );
            },
            onComplete: (data) => {
              showNotification('Answer From chat is ready.');
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(data.thread_id!, mode),
                (oldData) => {
                  return {
                    ...(oldData! || {}),
                    chat_name: data.chat_name,
                    _initialThought: false,
                    searchInfo: '',
                  };
                }
              );
              queryClient.setQueryData<{ chats: ChatListItem[] }>(
                getChatQueryKey('list', mode),
                (oldData) => {
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
                }
              );
            },
          })
        : startProjectRequest({ message, files, model });
    },
    onSuccess: (data, vars) => {
      if (!data) return;
      showNotification('Answer From chat is ready.');
      const tempChatId = `temp-${Date.now().toString()}`;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(data.thread_id!, mode),
        (oldData) => {
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
        }
      );
      queryClient.setQueryData<{ chats: ChatListItem[] }>(
        getChatQueryKey('list', mode),
        (oldData) => {
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
        }
      );
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

  return (
    <div className="grid place-items-center h-screen flex-col p-4">
      <div className="w-full max-w-2xl flex flex-col items-end gap-4">
        <Select onValueChange={(value: Mode) => setMode(value)} value={mode}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.values(Mode).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ChatInput
          clearOnSend={false}
          loading={isPending}
          onSend={(prompt, files) => {
            mutate({ message: prompt, files: files || undefined });
          }}
        />
      </div>
    </div>
  );
}
