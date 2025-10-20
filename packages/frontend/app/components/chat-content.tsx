import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Mode } from '@/routes/home';
import { Chat } from './chat';

import { ChatHeader } from './chat-header';

export const ChatContent = () => {
  return (
    <SidebarInset className="overflow-hidden">
      <header className="bg-background border-b group-data-[variant=floating]:border z-50 sticky top-0 flex h-14 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <ChatHeader />
      </header>

      <Chat mode={Mode.Chat} />
    </SidebarInset>
  );
};
