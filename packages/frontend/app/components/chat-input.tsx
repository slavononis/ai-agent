import { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import {
  ArrowUp,
  Loader,
  Mic,
  MicOff,
  Plus,
  File as FileIcon,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from './ui/card';
import SpeechRecognition, {
  useSpeechRecognition,
} from 'react-speech-recognition';
import { LLMSelect } from './LLM-Select';

type ChatInputProps = {
  onSend?: (message: string, files: File[] | null) => void;
  loading?: boolean;
  clearOnSend?: boolean;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const dedupeFiles = (arr: File[]) => {
  const map = new Map<string, File>();
  for (const f of arr) {
    const key = `${f.name}-${f.size}-${f.lastModified}`;
    if (!map.has(key)) map.set(key, f);
  }
  return Array.from(map.values());
};

const contentTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/csv',
  'text/plain',
  'application/json',
] as const;
export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  loading,
  clearOnSend = true,
}) => {
  const [value, setValue] = useState('');
  // Store files internally as an array so we can remove individual ones
  const [files, setFiles] = useState<File[]>([]);
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
    // Convert File[] -> FileList for onSend compatibility
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    const fileListToSend = dt.files.length ? dt.files : null;

    onSend?.(value, files);

    if (clearOnSend) {
      setValue('');
      setFiles([]);
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
    const list = e.target.files;
    if (list && list.length > 0) {
      setFiles((prev) => dedupeFiles([...prev, ...Array.from(list)]));

      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 0);
    }
  };

  const handleAudioRecording = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      resetTranscript();
      return;
    }
    SpeechRecognition.startListening({ continuous: true });
  };

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (transcript) {
      setValue(transcript);
      autoGrow();
    }
  }, [transcript]);

  // Create object URLs for image previews
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith('image/'),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const removeFileAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card
      className="w-full [&:has(textarea:focus)]:border-blue-500 shadow-[0_4px_12px_rgba(0,0,0,0.1),_0_30px_100px_rgba(192,211,255,0.08)]"
      onClick={() => textareaRef.current?.focus()}
    >
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
          className="border-none focus-visible:ring-0 max-h-[200px] min-h-[50px] resize-none shadow-none p-0 scrollbar-none pr-10"
        />
      </CardContent>

      <CardFooter className="gap-2 pt-0 justify-between items-start">
        <div className="flex gap-2 min-w-0 flex-wrap">
          <div className="flex items-start gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={loading}
            >
              <Plus className="!size-5" />
            </Button>
            <input
              ref={fileInputRef}
              accept={contentTypes.join(',')}
              onChange={handleFilesUpload}
              type="file"
              multiple
              style={{ display: 'none' }}
            />
            <LLMSelect />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 overflow-auto max-h-15">
              {previews.map(({ file, url, isImage }, idx) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                  className="group relative flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-2"
                >
                  <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-sm bg-background border">
                    {isImage ? (
                      <img
                        src={url}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="max-w-[140px] truncate text-xs font-medium">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatBytes(file.size)}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto h-6 w-6 shrink-0 rounded-full opacity-80 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFileAt(idx);
                    }}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {browserSupportsSpeechRecognition && (
            <Button
              size="icon"
              variant={listening ? 'destructive' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                handleAudioRecording();
              }}
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
            onClick={(e) => {
              e.stopPropagation();
              handleSendingProcess();
            }}
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
