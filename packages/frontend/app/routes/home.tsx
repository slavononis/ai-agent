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
import { startChatStream } from '@/services/conversation';
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
  const isChatMode = mode === Mode.Chat;
  const { mutate, isPending } = useMutation({
    mutationKey: getChatQueryKey('new-thread', mode),
    mutationFn: ({ message }: { message: string }) => {
      const tempChatId = `temp-${Date.now().toString()}`;

      return isChatMode
        ? startChatStream({
            message,
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
                          content: message,
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
              navigate(RoutesPath.Chat.replace(':id', threadId));
            },
            onError: (error) => {
              displayToastError(
                'Failed to start chat. Please try again. Details: ' + error
              );
            },
            onComplete: (thread_id) => {
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(thread_id!, mode),
                (oldData) => {
                  return {
                    ...(oldData! || {}),
                    _initialThought: false,
                  };
                }
              );
            },
          })
        : startProjectRequest({ message });
    },
    onSuccess: (data, vars) => {
      if (!data) return;
      const tempChatId = `temp-${Date.now().toString()}`;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(data.thread_id!, mode),
        (oldData) => {
          return {
            thread_id: data.thread_id!,
            messages: [
              ...(oldData?.messages || []),
              {
                id: tempChatId,
                thread_id: data.thread_id!,
                content: vars.message,
                role: Role.HumanMessage,
              },
              data,
            ],
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
            mutate({ message: prompt });
          }}
        />
      </div>
    </div>
  );
}
