import { GalleryVerticalEnd, Trash2 } from 'lucide-react';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sheet,
} from './ui/sheet';
import { Button } from './ui/button';
import { RoutesPath } from '@/utils/routes.config';

import { Mode } from '@/routes/home';
import { Link, useParams } from 'react-router';

import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormats';
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
} from './ui/alert-dialog';
import { useChatList, useDeleteChat } from '@/hooks/use-chats-list';
import { useChatMutationState } from '@/hooks/use-chat';

export const ProjectList = () => {
  const { id } = useParams();
  const { data, isLoading } = useChatList({ mode: Mode.Code });
  const { mutate, isPending } = useDeleteChat({ mode: Mode.Code });
  const mutationStates = useChatMutationState({ mode: Mode.Code });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <GalleryVerticalEnd className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Projects List</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-2">
          {isLoading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-10"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          ) : (
            <dl className="max-w-md divide-y divide-border text-foreground">
              {data?.chats?.map((chat) => {
                const mutation = mutationStates.find(
                  (m) => m.id === chat.thread_id
                );
                return (
                  <Link
                    to={RoutesPath.Project.replace(':id', chat.thread_id!)}
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
                    className={cn(
                      'group/chat flex flex-col pb-3 relative p-2',
                      {
                        'bg-muted rounded-md': chat.thread_id === id,
                        'animate-pulse bg-muted/50': mutation?.isPending,
                      }
                    )}
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
                            autoFocus
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Link>
                );
              })}
            </dl>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
