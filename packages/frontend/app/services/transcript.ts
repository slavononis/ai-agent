import api from '@/utils/axios.client';

// Text-to-Speech: Convert text to audio
export const textToSpeechRequest = async ({
  text,
  voice = 'coral',
}: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'coral' | 'shimmer';
}) => {
  return api
    .post<Blob>(
      '/api/transcript/text-to-speech',
      { text, voice },
      { responseType: 'blob' }
    )
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};

// Speech-to-Text: Convert audio to text
export const speechToTextRequest = async ({
  audioFile,
  language,
  prompt,
}: {
  audioFile: File;
  language?: string;
  prompt?: string;
}) => {
  const formData = new FormData();
  formData.append('audio', audioFile);

  if (language) {
    formData.append('language', language);
  }

  if (prompt) {
    formData.append('prompt', prompt);
  }

  return api
    .post<{ text: string }>('/api/transcript/speech-to-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
};
