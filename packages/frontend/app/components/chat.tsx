'use client';
import { useRef, useEffect } from 'react';
import { ChatInput } from './chat-input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  continueChatRequest,
  getProjectDetails,
  startChatRequest,
} from '@/services';
import { useParams } from 'react-router';
import { displayToastError } from '@/helpers/display-toast';
import { MarkdownRenderer } from './markdown-renderer';
import { cn } from '@/lib/utils';
import { Role, type MessagesResponseDTO } from '@monorepo/shared';
import { getChatQueryKey } from './chat.utils';
import { getFormattedMessage } from '@/utils/chat-formatter';

export const Chat = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (message: string) => {
      const tempChatId = `temp-${Date.now().toString()}`;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!),
        (oldData) => {
          return {
            thread_id: id!,
            messages: [
              ...(oldData?.messages || []),
              {
                id: tempChatId,
                thread_id: id!,
                content: message,
                role: Role.HumanMessage,
              },
            ],
          };
        }
      );
      scrollToBottom();

      return continueChatRequest({ message, thread_id: id! });
    },
    onSuccess: (data) => {
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!),
        (oldData) => {
          return {
            thread_id: id!,
            messages: [...(oldData?.messages || []), data],
          };
        }
      );
      scrollToBottom();
    },
    onError: () => {
      displayToastError('Failed to send message. Please try again.');
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!),
        (oldData) => {
          return {
            thread_id: id!,
            messages: [
              ...(oldData?.messages || []).filter(
                (msg) => !msg.id.startsWith('temp-')
              ),
            ],
          };
        }
      );
    },
  });

  const { data } = useQuery({
    queryKey: getChatQueryKey(id!),
    queryFn: () => getProjectDetails({ projectId: id! }),
    enabled: !!id,
  });

  // Scroll down whenever messages change
  useEffect(() => {
    if (data?.messages.length) {
      scrollToBottom();
    }
  }, [data?.messages]);

  return (
    <div className="relative flex h-full w-full flex-1 flex-col">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2">
        {data?.messages.map((msg, index) => {
          const content =
            msg.role === Role.AIMessage
              ? getFormattedMessage(msg.content || '').description
              : msg.content;
          return (
            <div
              key={msg.id || index}
              className={cn('p-4 rounded-lg animate-in', {
                'bg-blue-600/10': msg.role === Role.AIMessage,
                'bg-blue-100/10 self-end': msg.role === Role.HumanMessage,
              })}
            >
              <MarkdownRenderer content={content} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input stays sticky at bottom */}
      <div className="sticky bottom-0 bg-background p-2">
        <ChatInput
          loading={isPending}
          onSend={(prompt, files) => {
            mutate(prompt);
          }}
        />
      </div>
    </div>
  );
};
