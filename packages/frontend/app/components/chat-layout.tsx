import { SidebarProvider } from '@/components/ui/sidebar';

import { ChatSidebar } from './chat-sidebar';

import { ChatContent } from './chat-content';

export const ChatLayout = () => {
  return (
    <SidebarProvider sidebarWidth="18rem">
      <ChatSidebar />
      <ChatContent />
    </SidebarProvider>
  );
};
