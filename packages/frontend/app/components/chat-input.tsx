import { useEffect, useRef, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ArrowUp, Loader, Mic, MicOff, Plus, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from './ui/card';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
type ChatInputProps = {
  onSend?: (message: string, files: FileList | null) => void;
  loading?: boolean;
  clearOnSend?: boolean;
};

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  loading,
  clearOnSend = true,
}) => {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  const handleSendingProcess = () => {
    if (!value.trim() || loading) return;
    onSend?.(value, files);
    if (clearOnSend) {
      setValue('');
      setFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const autoGrow = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '5px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFiles(files);
    }
  };
  const handleAudioRecording = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      resetTranscript();
      return;
    }

    SpeechRecognition.startListening({
      continuous: true,
    });
  };
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (transcript) {
      setValue?.(transcript);
      autoGrow();
    }
  }, [transcript, setValue]);

  return (
    <Card>
      <CardContent>
        <Textarea
          ref={textareaRef}
          placeholder="Ask me anything..."
          onInput={autoGrow}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
              e.preventDefault();
              handleSendingProcess();
            }
          }}
          className="border-none focus-visible:ring-0 max-h-[200px] min-h-[50px] resize-none shadow-none p-0 scrollbar-none"
        />
      </CardContent>
      <CardFooter className="gap-2 pt-0 justify-between">
        <div>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Plus className="!size-5" />
          </Button>
          <input
            ref={fileInputRef}
            onChange={handleFilesUpload}
            type="file"
            multiple
            style={{ display: 'none' }}
          />
        </div>
        <div className="flex gap-2">
          {browserSupportsSpeechRecognition && (
            <Button
              size="icon"
              variant={listening ? 'destructive' : 'outline'}
              onClick={handleAudioRecording}
              className="rounded-full relative"
              disabled={loading}
            >
              {listening ? (
                <>
                  <Mic className="!size-4 animate-ping" />
                  <Mic className="!size-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </>
              ) : (
                <MicOff className="!size-4" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            onClick={handleSendingProcess}
            disabled={loading || !value.trim() || listening}
            className="rounded-full"
          >
            {loading ? (
              <Loader
                className="!size-5 animate-spin"
                style={{ animationDuration: '2s' }}
              />
            ) : (
              <ArrowUp className="!size-5" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
