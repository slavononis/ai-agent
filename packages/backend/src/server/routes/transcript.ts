import OpenAI from 'openai';
import { Router } from 'express';
import { Readable } from 'stream';
import multer from 'multer';
import { toFile } from 'openai';

const router = Router();
const openai = new OpenAI();
const upload = multer();

router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, voice = 'coral' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: voice,
      input: text,
      instructions: 'Speak in a cheerful and positive tone.',
      response_format: 'wav',
    });

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'inline; filename="speech.wav"');

    if (response.body) {
      const reader = response.body.getReader();
      const stream = new Readable({
        read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              this.push(null);
            } else {
              this.push(Buffer.from(value));
            }
          });
        },
      });

      return stream.pipe(res);
    } else {
      throw new Error('No response body received');
    }
  } catch (error) {
    console.log('Speech error', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
});

router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const { language, prompt } = req.body;

    const file = await toFile(req.file.buffer, req.file.originalname);

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'gpt-4o-transcribe',
      language: language || undefined,
      prompt: prompt || undefined,
      response_format: 'json',
    });

    return res.json({ text: response.text });
  } catch (error) {
    console.log('Transcription error', error);
    return res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

export default router;
