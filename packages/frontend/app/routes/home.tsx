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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { startChatRequest } from '@/services/conversation';
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
    mutationFn: isChatMode ? startChatRequest : startProjectRequest,
    onSuccess: (data, vars) => {
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
