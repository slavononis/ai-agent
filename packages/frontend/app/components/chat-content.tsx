import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getChatQueryKey } from './chat.utils';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Mode } from '@/routes/home';
import { Chat } from './chat';
import { getChatDetails } from '@/services/conversation';
import { Skeleton } from './ui/skeleton';

export const ChatContent = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: getChatQueryKey(id!, Mode.Chat),
    queryFn: () => getChatDetails({ projectId: id! }),

    enabled: (enabled) => !enabled.state.data?._initialThought && !!id,
  });
  return (
    <SidebarInset className="overflow-hidden">
      <header className="bg-background border-b group-data-[variant=floating]:border z-50 sticky top-0 flex h-14 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex justify-center w-full">
          {isLoading ? (
            <Skeleton className="h-10 w-xl" />
          ) : (
            <h1 className="text-center text-lg font-semibold leading-none tracking-tight">
              {data?.chat_name}
            </h1>
          )}
        </div>
      </header>

      <Chat mode={Mode.Chat} />
    </SidebarInset>
  );
};
