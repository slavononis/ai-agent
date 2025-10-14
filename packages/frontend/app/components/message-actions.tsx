import { displayToastError } from '@/helpers/display-toast';
import { useState } from 'react';
import { Button } from './ui/button';
import { Check, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

type MessageActionsProps = {
  text: string;
  messageId?: string;
  disabled?: boolean;
  isAi: boolean;
};
export const MessageActions: React.FC<MessageActionsProps> = ({
  text,
  disabled,
  isAi,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      displayToastError('Failed to copy to clipboard');
    }
  };

  return (
    <div
      className={cn('flex gap-2 mb-2 justify-end', { 'justify-start': isAi })}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={handleCopy} disabled={disabled}>
            {copied ? (
              <Check className="size-5" />
            ) : (
              <Copy className="size-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>
    </div>
  );
};
