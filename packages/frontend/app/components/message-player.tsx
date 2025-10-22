import { textToSpeechRequest } from '@/services/transcript';
import { useMutation } from '@tanstack/react-query';
import { Loader, Pause, Play, Square, Volume2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { displayToastError } from '@/helpers/display-toast';

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

interface AudioCache {
  url: string;
  audioElement: HTMLAudioElement;
}

let globalAudioRef: HTMLAudioElement | null = null;

export const MessagePlayer = ({ text }: { text: string }) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const audioCacheRef = useRef<AudioCache | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopOtherInstances = () => {
    if (globalAudioRef && globalAudioRef !== audioRef.current) {
      globalAudioRef.pause();
      globalAudioRef.currentTime = 0;
    }
    globalAudioRef = audioRef.current;
  };

  const mutation = useMutation({
    mutationFn: textToSpeechRequest,
    onSuccess: (audioBlob) => {
      if (audioCacheRef.current) {
        URL.revokeObjectURL(audioCacheRef.current.url);
        audioCacheRef.current = null;
      }

      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audioCacheRef.current = {
        url,
        audioElement: audio,
      };

      audio.onended = () => {
        setPlaybackState('idle');
        if (globalAudioRef === audioRef.current) {
          globalAudioRef = null;
        }
      };
      audio.onplay = () => setPlaybackState('playing');
      audio.onpause = () => setPlaybackState('paused');

      stopOtherInstances();
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        setPlaybackState('idle');
      });
    },
    onError: (e) => {
      displayToastError(e.message);
      setPlaybackState('idle');
    },
  });

  const handlePlay = () => {
    if (audioCacheRef.current) {
      const cachedAudio = audioCacheRef.current.audioElement;
      audioRef.current = cachedAudio;

      cachedAudio.onended = () => {
        setPlaybackState('idle');
        if (globalAudioRef === audioRef.current) {
          globalAudioRef = null;
        }
      };
      cachedAudio.onplay = () => setPlaybackState('playing');
      cachedAudio.onpause = () => setPlaybackState('paused');

      if (playbackState === 'paused') {
        stopOtherInstances();
        cachedAudio.play().catch((error) => {
          console.error('Error resuming audio:', error);
          setPlaybackState('idle');
        });
      } else {
        cachedAudio.currentTime = 0;
        stopOtherInstances();
        cachedAudio.play().catch((error) => {
          console.error('Error playing cached audio:', error);
          setPlaybackState('idle');
        });
      }
    } else if (playbackState === 'idle') {
      setPlaybackState('loading');
      mutation.mutate({ text });
    }
  };

  const handlePause = () => {
    if (audioRef.current && playbackState === 'playing') {
      audioRef.current.pause();
    }
  };

  const handleStop = () => {
    // Prevents set on audio.onpause
    setTimeout(() => {
      setPlaybackState('idle');
    }, 1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (globalAudioRef === audioRef.current) {
      globalAudioRef = null;
    }
  };

  useEffect(() => {
    return () => {
      if (audioCacheRef.current) {
        URL.revokeObjectURL(audioCacheRef.current.url);
        audioCacheRef.current = null;
      }
      if (globalAudioRef === audioRef.current) {
        globalAudioRef = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioCacheRef.current) {
      URL.revokeObjectURL(audioCacheRef.current.url);
      audioCacheRef.current = null;
      setPlaybackState('idle');
    }
  }, [text]);

  if (playbackState === 'loading') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost">
            <Loader
              className="size-5 animate-spin text-blue-500"
              style={{ animationDuration: '2s' }}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Generating audio...</TooltipContent>
      </Tooltip>
    );
  }

  if (playbackState === 'playing') {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={handlePause}>
              <Pause className="size-5 text-blue-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pause</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={handleStop}>
              <Square className="size-5 text-red-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop</TooltipContent>
        </Tooltip>
        <Volume2 className="size-5 text-green-500 animate-pulse" />
      </div>
    );
  }

  if (playbackState === 'paused') {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={handlePlay}>
              <Play className="size-5 text-green-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resume</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" onClick={handleStop}>
              <Square className="size-5 text-red-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={'ghost'}
          onClick={handlePlay}
          disabled={mutation.isPending}
        >
          <Play className="size-5 text-green-500" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Play</TooltipContent>
    </Tooltip>
  );
};
