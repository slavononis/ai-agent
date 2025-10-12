import React, {
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  useEffect,
  useMemo,
} from 'react';
import { Mode } from '@/routes/home';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getChatQueryKey } from './chat.utils';
import { useParams } from 'react-router';
import { getChatDetails } from '@/services/conversation';
import { getProjectDetails } from '@/services/project';
import { cn } from '@/lib/utils';
import {
  chatRoles,
  getFormattedMessage,
  getStructuralContent,
} from '@/utils/chat-formatter';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type ChatScrollbarProps = {
  mode: Mode;
  onSelect: (msgId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export type ChatScrollbarRef = {
  sync: (msgId: string) => void;
};

export const ChatScrollbar = forwardRef<ChatScrollbarRef, ChatScrollbarProps>(
  ({ mode, onSelect, containerRef: parentRef }, ref) => {
    const { id } = useParams();
    const isChatMode = mode === Mode.Chat;
    const containerRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
      queryKey: getChatQueryKey(id!, mode),
      queryFn: () =>
        isChatMode
          ? getChatDetails({ projectId: id! })
          : getProjectDetails({ projectId: id! }),
      enabled: (enabled) => !enabled.state.data?._initialThought && !!id,
    });

    const messages = useMemo(() => {
      return data?.messages || [];
    }, [data?.messages]);

    const handleScroll = (id: string) => {
      const el = containerRef.current?.querySelector(`#scroll-${id}`);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const handleChange = (id: string, scroll = true) => {
      setActive(id);
      onSelect(id);
      if (scroll) {
        handleScroll(id);
      }
    };

    const getCurrentIndex = () => {
      if (!active || !messages.length) return -1;
      return messages.findIndex((msg) => msg.id === active);
    };

    const handlePrevious: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      const currentIndex = getCurrentIndex();
      if (currentIndex > 0 && messages.length) {
        const prevId = messages[currentIndex - 1].id;
        handleChange(prevId);
      }
    };

    const handleNext: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      const currentIndex = getCurrentIndex();
      const lastIndex = (messages?.length || 0) - 1 || 0;
      if (currentIndex < lastIndex && messages.length) {
        const nextId = messages[currentIndex + 1].id;

        handleChange(nextId);
      }
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      sync: (msg) => {
        setActive(msg);
        // TODO : fix circular scroll
        // handleScroll(msg);
      },
    }));

    useEffect(() => {
      const lastMessage = messages?.[messages.length - 1];
      if (lastMessage?.id && !active) {
        handleChange(lastMessage?.id);
      }
    }, [messages, active]);

    if (isLoading || error) return null;

    return (
      <div ref={containerRef} className="sticky top-0 mr-1">
        <div className="group flex flex-col items-center gap-1">
          <button
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:shrink-0 select-none  hover:bg-accent/20 disabled:hover:bg-transparent border border-transparent h-8 gap-1.5 rounded-full overflow-hidden w-8 px-1.5 py-1.5 !opacity-0 transition-opacity duration-200 group-hover:!opacity-100 disabled:group-hover:!opacity-60"
            type="button"
            aria-label="Navigate to previous message"
            data-state="closed"
            onClick={handlePrevious}
            disabled={getCurrentIndex() <= 0} // Optional: Disable if at start
          >
            <ChevronUp className="size-4" />
          </button>

          <div className="max-h-[calc(100vh-264px)] overflow-auto flex flex-col items-center gap-0 scrollbar-none">
            {messages?.map((msg) => {
              const isAI = chatRoles.includes(msg.role);
              const isActive = active === msg.id;
              const content = isAI
                ? isChatMode
                  ? msg.content
                  : getFormattedMessage(
                      typeof msg.content === 'string' ? msg.content : ''
                    ).description
                : msg.content;
              return (
                <Tooltip key={msg.id}>
                  <TooltipTrigger asChild>
                    <button
                      id={`scroll-${msg.id}`}
                      className="gap-2 whitespace-nowrap font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-100 [&_svg]:shrink-0 select-none  hover:bg-accent/20 disabled:hover:bg-transparent border border-transparent px-2.5 text-xs group relative flex items-center justify-end w-8 min-h-4 rounded animate-none"
                      type="button"
                      aria-label="Goto answer"
                      onClick={() => {
                        handleChange(msg.id);
                      }}
                    >
                      <div
                        className={cn(
                          'rounded-full transition-all duration-200 w-1 min-h-0.5 bg-secondary',
                          { 'w-2': isAI, 'min-h-1 bg-accent': isActive }
                        )}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <h5 className="font-bold">{isAI ? 'Assistant' : 'You'}</h5>
                    <p className="text-muted-foreground max-w-[200px] break-words">
                      {getStructuralContent(content).substring(0, 100) ||
                        'No content'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <button
            className="inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:shrink-0 select-none  hover:bg-accent/20 disabled:hover:bg-transparent border border-transparent h-8 gap-1.5 rounded-full overflow-hidden w-8 px-1.5 py-1.5 !opacity-0 transition-opacity duration-200 group-hover:!opacity-100 disabled:group-hover:!opacity-60"
            type="button"
            aria-label="Navigate to next message"
            onClick={handleNext} // Add this: Call the new handler
            disabled={getCurrentIndex() >= (messages?.length || 0) - 1} // Optional: Disable if at end
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>
    );
  }
);

ChatScrollbar.displayName = 'ChatScrollbar';
