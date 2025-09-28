import { ChatInput } from '@/components/chat-input';
import type { Route } from './+types/home';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { startChatRequest } from '@/services';
import { RoutesPath } from '@/utils/routes.config';
import { displayToastError } from '@/helpers/display-toast';
import { Role, type MessagesResponseDTO } from '@monorepo/shared';
import { getChatQueryKey } from '@/components/chat.utils';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: startChatRequest,
    onSuccess: (data, vars) => {
      const tempChatId = `temp-${Date.now().toString()}`;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(data.thread_id!),
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
      navigate(RoutesPath.Project.replace(':id', data.thread_id));
    },
    onError: (error) => {
      displayToastError('Failed to start chat. Please try again.');
    },
  });
  return (
    <div className="grid place-items-center h-screen flex-col p-4">
      <div className="w-full max-w-2xl flex flex-col gap-4">
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
