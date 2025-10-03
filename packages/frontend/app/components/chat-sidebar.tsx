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
} from '@/services/conversation';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { RoutesPath } from '@/utils/routes.config';
import { formatDate } from '@/utils/dateFormats';

export function ChatSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: getChatQueryKey('list', Mode.Chat),
    queryFn: getChatsListRequest,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (threadId: string) => deleteChatRequest(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getChatQueryKey('list', Mode.Chat),
      });
    },
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
                className="group/chat flex flex-col pb-3 relative"
              >
                <dd className="pt-1 mb-1 text-sm font-semibold text-foreground">
                  {chat.thread_id}
                </dd>
                <dt className="text-xs text-muted-foreground">
                  {formatDate(chat.ts)}
                </dt>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    {/* <Button variant="outline">Show Dialog</Button> */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute right-0 bottom-0 -translate-y-1/2 invisible group-hover/chat:visible size-6"
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
                        delete your chat and remove your data from our servers.
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
