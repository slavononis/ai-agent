import { ChatInput } from '@/components/chat-input';
import type { Route } from './+types/home';
import Lottie from 'react-lottie-player';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { useNewChatRequest } from '@/hooks/use-chat';
export function meta({}: Route.MetaArgs) {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export enum Mode {
  Chat = 'Chat',
  Code = 'Code',
}
import spaceJson from '@/lottie/space.json';

export default function Home() {
  const [mode, setMode] = useState<Mode>(Mode.Chat);
  const { mutate, isPending } = useNewChatRequest({ mode });

  return (
    <div className="grid place-items-center h-screen flex-col p-4 relative overflow-hidden">
      <Lottie
        loop
        animationData={spaceJson}
        play
        className="absolute aspect-video -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto h-screen md:h-auto md:w-full"
      />
      <div className="w-full max-w-2xl flex flex-col items-end gap-4">
        <Select onValueChange={(value: Mode) => setMode(value)} value={mode}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Select a mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.values(Mode).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {mode}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ChatInput
          clearOnSend={false}
          loading={isPending}
          onSend={(prompt, files) => {
            mutate({ message: prompt, files: files || undefined });
          }}
        />
      </div>
    </div>
  );
}
