import * as React from 'react';
import { GalleryVerticalEnd, Trash2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChatQueryKey } from './chat.utils';

import { Mode } from '@/routes/home';
import {
  getChatsListRequest,
  deleteChatRequest,
  getChatDetails,
} from '@/services/conversation';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useParams } from 'react-router';
import { RoutesPath } from '@/utils/routes.config';
import { formatDate } from '@/utils/dateFormats';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

export function ChatSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: getChatQueryKey('list', Mode.Chat),
    queryFn: getChatsListRequest,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (threadId: string) => deleteChatRequest(threadId),
    onSuccess: async (_, threadId) => {
      const updates = queryClient.setQueryData<{
        chats: {
          thread_id: string;
          ts: string;
        }[];
      }>(getChatQueryKey('list', Mode.Chat), (oldData) => {
        return {
          chats: (oldData?.chats || [])?.filter(
            (chat) => chat.thread_id !== threadId
          ),
        };
      });
      if (threadId === id) {
        const firstChatId = updates?.chats?.[0]?.thread_id;
        if (firstChatId) {
          navigate(RoutesPath.Chat.replace(':id', firstChatId));
        } else {
          navigate(RoutesPath.Home, { replace: true });
        }
      }
    },
  });
  const [threadLoading, setThreadLoading] = React.useState(false);
  queryClient.getMutationCache().subscribe(({ mutation }) => {
    if (
      mutation?.options.mutationKey?.join(',') ===
      getChatQueryKey(id!, Mode.Chat).join(',')
    ) {
      setThreadLoading(mutation.state.status === 'pending');
    }
  });
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader className="flex items-center flex-row gap-4 border-b">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {isLoading ? (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-10" style={{ animationDelay: '0.1s' }} />
              <Skeleton className="h-10" style={{ animationDelay: '0.2s' }} />
              <Skeleton className="h-10" style={{ animationDelay: '0.3s' }} />
              <Skeleton className="h-10" style={{ animationDelay: '0.4s' }} />
              <Skeleton className="h-10" style={{ animationDelay: '0.5s' }} />
            </div>
          ) : (
            <dl className="max-w-md divide-y divide-border text-foreground">
              {data?.chats.map((chat) => (
                <Link
                  to={RoutesPath.Chat.replace(':id', chat.thread_id!)}
                  replace
                  key={chat.thread_id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;

                    if (
                      target.closest('button') ||
                      target.closest('div[data-slot="alert-dialog-overlay"]')
                    ) {
                      e.preventDefault(); // stop navigation
                      return;
                    }
                  }}
                  className={cn('group/chat flex flex-col pb-3 relative p-2', {
                    'bg-muted rounded-md': chat.thread_id === id,
                    'animate-pulse': threadLoading && chat.thread_id === id,
                  })}
                >
                  <dd className="pt-1 mb-1 text-sm font-semibold text-foreground truncate">
                    {chat.chat_name}
                  </dd>
                  <dt className="text-xs text-muted-foreground">
                    {formatDate(chat.updated_at)}
                  </dt>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 bottom-0 -translate-y-1/2 invisible group-hover/chat:visible size-6"
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your chat and remove your data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => mutate(chat.thread_id)}
                          disabled={isPending}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Link>
              ))}
            </dl>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
