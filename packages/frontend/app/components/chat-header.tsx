import { useChatData } from '@/hooks/use-chat';
import { Mode } from '@/routes/home';
import { Skeleton } from './ui/skeleton';

export const ChatHeader = () => {
  const { data, isLoading } = useChatData({ mode: Mode.Chat });

  return (
    <div className="flex justify-center w-full">
      {isLoading ? (
        <Skeleton className="h-10 max-w-xl w-full" />
      ) : (
        <h1 className="text-center text-lg font-semibold leading-none tracking-tight">
          {data?.chat_name}
        </h1>
      )}
    </div>
  );
};
