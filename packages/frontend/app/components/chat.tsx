'use client';
import { useRef, useEffect, useState, useMemo } from 'react';
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
  chatRoles,
  getFormattedMessage,
  getStructuralContent,
  setStructuralContent,
} from '@/utils/chat-formatter';
import { Mode } from '@/routes/home';
import { continueChatStream, getChatDetails } from '@/services/conversation';
import { Button } from './ui/button';
import { ChevronDown, Loader } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { RoutesPath } from '@/utils/routes.config';
import { useLLMModel } from '@/store';
import { ChatScrollbar, type ChatScrollbarRef } from './chat-scrollbar';
import { Alert, AlertDescription } from './ui/alert';

type ChatProps = {
  mode: Mode;
};

export const Chat: React.FC<ChatProps> = ({ mode }) => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const model = useLLMModel((state) => state.model);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<ChatScrollbarRef>(null);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(null);

  const isChatMode = mode === Mode.Chat;

  const scrollToBottom = (behavior?: ScrollBehavior) => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const checkScrollPosition = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setShowScrollButton(distanceFromBottom > 700);

    setAutoScrollEnabled(distanceFromBottom <= 20);
  };

  const handleUserScroll = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setIsUserScrolling(true);
    scrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 200);
    checkScrollPosition();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    handleUserScroll();

    const container = chatContainerRef.current;
    if (!container) return;

    const ids = messages.map((msg) => msg.id);
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    ids.forEach((id) => {
      const el = container.querySelector(`#msg-${id}`) as HTMLDivElement | null;
      if (!el) return;

      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const elBottom = elTop + elHeight;

      const isInView =
        elBottom > containerScrollTop &&
        elTop < containerScrollTop + containerHeight;

      if (isInView) {
        scrollbarRef.current?.sync(id);
      }
    });
  };

  const { mutate, isPending } = useMutation({
    mutationKey: getChatQueryKey(id!, mode),
    mutationFn: ({ message, files }: { message: string; files?: File[] }) => {
      const tempChatId = `temp-${Date.now().toString()}`;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!, mode),
        (oldData) => ({
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
        })
      );

      return isChatMode
        ? continueChatStream({
            message,
            model,
            files,
            threadId: id!,
            onComplete: (chunk) => {
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(chunk.thread_id!, mode),
                (oldData) => {
                  return {
                    ...oldData!,
                    searchInfo: '',
                  };
                }
              );
            },
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
                getChatQueryKey(id!, mode),
                (oldData) => {
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
                }
              );
            },
            onError: (error) => {
              displayToastError(
                'Failed to send message. Please try again. Details: ' + error
              );
              queryClient.setQueryData<MessagesResponseDTO>(
                getChatQueryKey(id!, mode),
                (oldData) => ({
                  thread_id: id!,
                  messages: (oldData?.messages || []).filter(
                    (msg) => !msg.id.startsWith('temp-')
                  ),
                })
              );
            },
          })
        : continueProjectRequest({ message, thread_id: id!, files, model });
    },
    onSuccess: (data) => {
      if (!data) return;
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!, mode),
        (oldData) => ({
          thread_id: id!,
          messages: [...(oldData?.messages || []), data],
        })
      );
      if (autoScrollEnabled && !isUserScrolling) scrollToBottom();
    },
    onError: () => {
      displayToastError('Failed to send message. Please try again.');
      queryClient.setQueryData<MessagesResponseDTO>(
        getChatQueryKey(id!, mode),
        (oldData) => ({
          thread_id: id!,
          messages: (oldData?.messages || []).filter(
            (msg) => !msg.id.startsWith('temp-')
          ),
        })
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

  const messages = useMemo(() => data?.messages || [], [data?.messages]);

  useEffect(() => {
    if (messages.length && autoScrollEnabled && !isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, autoScrollEnabled, isUserScrolling]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
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
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton
              key={i}
              className={cn('h-24 w-full max-w-2xl bg-blue-600/10', {
                'ml-auto h-12 bg-blue-100/10': i % 2 === 0,
              })}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      ) : (
        <div
          ref={chatContainerRef}
          className="overflow-y-auto flex"
          onScroll={handleScroll}
        >
          <>
            <div
              className="flex-1 flex flex-col gap-2 p-2"
              style={{ width: '90%' }}
            >
              {messages.map((msg, index) => {
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
                    id={`msg-${msg.id}`}
                    key={msg.id || index}
                    className={cn('p-4 rounded-lg animate-in chat-message', {
                      'bg-blue-600/10': isAI,
                      'bg-blue-100/10 ml-auto': msg.role === Role.HumanMessage,
                    })}
                  >
                    <MarkdownRenderer content={getStructuralContent(content)} />
                  </div>
                );
              })}
              {data?.searchInfo && (
                <Alert className="fade-in">
                  <AlertDescription>
                    <MarkdownRenderer content={data.searchInfo} />
                  </AlertDescription>
                </Alert>
              )}

              {chatThinking && (
                <div className="flex gap-4 animate-pulse bg-muted p-4 rounded-lg self-start">
                  Thinking...{' '}
                  <Loader
                    className="animate-spin"
                    style={{ animationDuration: '2s' }}
                  />
                </div>
              )}

              <div className="ref" ref={messagesEndRef} />
            </div>
          </>
          <ChatScrollbar
            ref={scrollbarRef}
            containerRef={chatContainerRef}
            mode={mode}
            onSelect={(msgId) => {
              requestAnimationFrame(() => {
                const el = chatContainerRef.current?.querySelector(
                  `#msg-${msgId}`
                );
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              });
            }}
          />
        </div>
      )}

      <div className="sticky bottom-0 bg-background p-2 mt-auto">
        {showScrollButton && (
          <Button
            size="icon"
            onClick={() => {
              scrollToBottom('smooth');
              setTimeout(() => setAutoScrollEnabled(true), 500);
            }}
            className="absolute top-6 right-5 z-50 rounded-full animate-bounce"
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
