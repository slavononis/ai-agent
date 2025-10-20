import { getChatQueryKey } from '@/components/chat.utils';
import { Mode } from '@/routes/home';
import {
  deleteChatRequest,
  getChatsListRequest,
  type ChatListItem,
} from '@/services/conversation';
import {
  deleteProjectRequest,
  getProjectsListRequest,
} from '@/services/project';
import { RoutesPath } from '@/utils/routes.config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';

export const useChatListUpdate = ({ mode }: { mode: Mode }) => {
  const queryClient = useQueryClient();

  return (
    updater: (oldData: { chats: ChatListItem[] } | undefined) => {
      chats: ChatListItem[];
    }
  ) => {
    return queryClient.setQueryData<{ chats: ChatListItem[] }>(
      getChatQueryKey('list', mode),
      updater
    );
  };
};

export const useChatList = ({ mode }: { mode: Mode }) => {
  const isChatMode = mode === Mode.Chat;

  return useQuery({
    queryKey: getChatQueryKey('list', mode),
    queryFn: isChatMode ? getChatsListRequest : getProjectsListRequest,
  });
};

export const useDeleteChat = ({ mode }: { mode: Mode }) => {
  const navigate = useNavigate();
  const isChatMode = mode === Mode.Chat;
  const updateChatsList = useChatListUpdate({ mode });
  const { id } = useParams<{ id: string }>();

  return useMutation({
    mutationFn: (threadId: string) =>
      isChatMode ? deleteChatRequest(threadId) : deleteProjectRequest(threadId),
    onSuccess: async (_, threadId) => {
      const updates = updateChatsList((oldData) => {
        return {
          chats: (oldData?.chats || [])?.filter(
            (chat) => chat.thread_id !== threadId
          ),
        };
      });
      if (threadId === id) {
        const firstChatId = updates?.chats?.[0]?.thread_id;
        if (firstChatId) {
          const currentPath = isChatMode ? RoutesPath.Chat : RoutesPath.Project;
          navigate(currentPath.replace(':id', firstChatId), {
            replace: true,
          });
        } else {
          navigate(RoutesPath.Home, { replace: true });
        }
      }
    },
  });
};
