'use client';
import { useRef, useEffect, useState } from 'react';
import { ChatInput } from './chat-input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { continueProjectRequest, getProjectDetails } from '@/services/project';
import { useParams } from 'react-router';
import { displayToastError } from '@/helpers/display-toast';
import { MarkdownRenderer } from './markdown-renderer';
import { cn } from '@/lib/utils';
import {
  Role,
  type MessageResponseDTO,
  type MessagesResponseDTO,
} from '@monorepo/shared';
import { getChatQueryKey } from './chat.utils';
import { getFormattedMessage } from '@/utils/chat-formatter';
import { Mode } from '@/routes/home';
import { continueChatStream, getChatDetails } from '@/services/conversation';
import { Button } from './ui/button';
import { ChevronDown, Loader } from 'lucide-react';

type ChatProps = {
  mode: Mode;
};
const chatRoles = [Role.AIMessage, Role.AIMessageChunk];

export const Chat: React.FC<ChatProps> = ({ mode }) => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isChatMode = mode === Mode.Chat;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show button when more than 150px from bottom
    setShowScrollButton(distanceFromBottom > 150);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: (message: string) => {
      const tempChatId = `temp-${Date.now().toString()}`;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!, mode),
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

      return isChatMode
        ? continueChatStream({
            message,
            threadId: id!,
            onChunk: (chunk) => {
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(id!, mode),
                (oldData) => {
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
                    };
                  }

                  // Otherwise, create a new message
                  return {
                    ...oldData!,
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
            onError: (error) => {
              displayToastError(
                'Failed to send message. Please try again. Details: ' + error
              );
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(id!, mode),
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
            onComplete: () => {
              console.log('onComplete');
            },
          })
        : continueProjectRequest({ message, thread_id: id! });
    },
    onSuccess: (data) => {
      if (!data) return;

      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!, mode),
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
        getChatQueryKey(id!, mode),
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
    queryKey: getChatQueryKey(id!, mode),
    queryFn: () =>
      isChatMode
        ? getChatDetails({ projectId: id! })
        : getProjectDetails({ projectId: id! }),
    enabled: !!id,
  });

  // Scroll down whenever messages change
  useEffect(() => {
    if (data?.messages.length) {
      scrollToBottom();
    }
  }, [data?.messages]);

  // Add scroll event listener to check scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition);

    // Initial check
    checkScrollPosition();

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
    };
  }, []);
  const chatThinking =
    data?._initialThought || isPending || data?.messages.length === 1;
  return (
    <div
      className={cn('relative flex h-full w-full flex-1 flex-col', {
        'max-h-[calc(100vh-56px)]': isChatMode,
      })}
    >
      {/* Scrollable message area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 p-2"
      >
        {data?.messages.map((msg, index) => {
          const content = chatRoles.includes(msg.role)
            ? isChatMode
              ? msg.content
              : getFormattedMessage(msg.content || '').description
            : msg.content;
          return (
            <div
              key={msg.id || index}
              className={cn('p-4 rounded-lg animate-in', {
                'bg-blue-600/10 self-start': chatRoles.includes(msg.role),
                'bg-blue-100/10 self-end': msg.role === Role.HumanMessage,
              })}
            >
              <MarkdownRenderer content={content} />
            </div>
          );
        })}
        {chatThinking && (
          <div className="flex gap-4 animate-pulse bg-muted p-4 rounded-lg self-start">
            Thinking...{' '}
            <Loader
              className="animate-spin"
              style={{ animationDuration: '2s' }}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input stays sticky at bottom */}
      <div className="sticky bottom-0 bg-background p-2">
        {showScrollButton && (
          <Button
            size="icon"
            onClick={scrollToBottom}
            className="absolute top-6 right-5.5 z-50 rounded-full animate-bounce"
            aria-label="Scroll to bottom"
          >
            <ChevronDown />
          </Button>
        )}
        <ChatInput
          loading={chatThinking}
          onSend={(prompt, files) => {
            mutate(prompt);
            console.log(files);
          }}
        />
      </div>
    </div>
  );
};
