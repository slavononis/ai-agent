'use client';
import { useRef, useEffect, useState } from 'react';
import { ChatInput } from './chat-input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { continueProjectRequest, getProjectDetails } from '@/services/project';
import { Link, useParams } from 'react-router';
import { displayToastError } from '@/helpers/display-toast';
import { MarkdownRenderer } from './markdown-renderer';
import { cn } from '@/lib/utils';
import { Role, type MessagesResponseDTO } from '@monorepo/shared';
import { getChatQueryKey } from './chat.utils';
import {
  getFormattedMessage,
  getStructuralContent,
  setStructuralContent,
} from '@/utils/chat-formatter';
import { Mode } from '@/routes/home';
import { continueChatStream, getChatDetails } from '@/services/conversation';
import { Button } from './ui/button';
import { ChevronDown, Loader } from 'lucide-react';
import _ from 'lodash';
import { Skeleton } from './ui/skeleton';
import { RoutesPath } from '@/utils/routes.config';

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
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(null);
  const isChatMode = mode === Mode.Chat;

  const scrollToBottom = (behavior?: ScrollBehavior) => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const checkScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show button when more than 150px from bottom
    setShowScrollButton(distanceFromBottom > 150);

    // Enable auto-scroll if user is at the bottom (within 50px)
    const isAtBottom = distanceFromBottom <= 50;
    setAutoScrollEnabled(isAtBottom);
  };

  const handleUserScroll = () => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set user scrolling state
    setIsUserScrolling(true);

    // Set a timeout to reset user scrolling state after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 200);

    checkScrollPosition();
  };

  const { mutate, isPending } = useMutation({
    mutationKey: getChatQueryKey(id!, mode),
    mutationFn: ({ message, files }: { message: string; files?: File[] }) => {
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
                content: files ? setStructuralContent(message, files) : message,
                role: Role.HumanMessage,
              },
            ],
          };
        }
      );

      return isChatMode
        ? continueChatStream({
            message,
            files,
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

      // Only auto-scroll if user hasn't manually scrolled up
      if (autoScrollEnabled && !isUserScrolling) {
        scrollToBottom();
      }
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

  const { data, isLoading, error } = useQuery({
    queryKey: getChatQueryKey(id!, mode),
    queryFn: () =>
      isChatMode
        ? getChatDetails({ projectId: id! })
        : getProjectDetails({ projectId: id! }),
    enabled: (enabled) => !enabled.state.data?._initialThought && !!id,
  });

  // Scroll down whenever messages change, but only if auto-scroll is enabled
  useEffect(() => {
    if (data?.messages.length && autoScrollEnabled && !isUserScrolling) {
      scrollToBottom();
    }
  }, [data?.messages, autoScrollEnabled, isUserScrolling]);

  // Add scroll event listener to check scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleUserScroll);

    // Initial check
    checkScrollPosition();

    return () => {
      container.removeEventListener('scroll', handleUserScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const chatThinking = data?._initialThought || isPending;

  return (
    <div
      className={cn('relative flex h-full w-full flex-1 flex-col', {
        'max-h-[calc(100vh-56px)]': isChatMode,
      })}
    >
      {error ? (
        <div className="flex flex-col gap-2 h-full w-full p-2 justify-center items-center">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <Link to={RoutesPath.Home} replace>
            <Button>Home</Button>
          </Link>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-2 h-full w-full p-2">
          <Skeleton
            className="ml-auto h-12 w-full max-w-2xl bg-blue-100/10"
            style={{ animationDelay: '0.1s' }}
          />
          <Skeleton
            className="h-24 w-full max-w-2xl bg-blue-600/10"
            style={{ animationDelay: '0.2s' }}
          />
          <Skeleton
            className="ml-auto h-12 w-full max-w-2xl bg-blue-100/10"
            style={{ animationDelay: '0.3s' }}
          />
          <Skeleton
            className="h-24 w-full max-w-2xl bg-blue-600/10"
            style={{ animationDelay: '0.4s' }}
          />
          <Skeleton
            className="ml-auto h-12 w-full max-w-2xl bg-blue-100/10"
            style={{ animationDelay: '0.5s' }}
          />
          <Skeleton
            className="h-24 w-full max-w-2xl bg-blue-600/10"
            style={{ animationDelay: '0.6s' }}
          />
        </div>
      ) : (
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto flex flex-col gap-2 p-2"
        >
          {data?.messages.map((msg, index, arr) => {
            const isAI = chatRoles.includes(msg.role);
            const content = isAI
              ? isChatMode
                ? msg.content
                : getFormattedMessage(
                    typeof msg.content === 'string' ? msg.content : ''
                  ).description
              : msg.content;
            return (
              <div
                key={msg.id || index}
                className={cn('p-4 rounded-lg animate-in', {
                  'bg-blue-600/10': isAI,
                  'bg-blue-100/10 ml-auto': msg.role === Role.HumanMessage,
                })}
              >
                <MarkdownRenderer content={getStructuralContent(content)} />
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
      )}

      <div className="sticky bottom-0 bg-background p-2">
        {showScrollButton && (
          <Button
            size="icon"
            onClick={() => {
              scrollToBottom('smooth');
              setAutoScrollEnabled(true); // Re-enable auto-scroll when user clicks the button
            }}
            className="absolute top-6 right-5.5 z-50 rounded-full animate-bounce"
            aria-label="Scroll to bottom"
          >
            <ChevronDown />
          </Button>
        )}
        <ChatInput
          loading={chatThinking}
          onSend={(message, files) => {
            mutate({ message, files: files || undefined });
          }}
        />
      </div>
    </div>
  );
};
