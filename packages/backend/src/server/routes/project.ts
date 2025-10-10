import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { getFormattedMessage } from '../utils/message-format';
import multer from 'multer';
import { ALLOWED_MIME_TYPES, AppMimeType } from '../chat-manager/utils';
import { ChatEngine } from '../chat-manager/chat-engine';
import { generateChatName } from '../chat-manager/generate-chat-name';
import { serializeError } from '../utils/error';

const baseEngineOptions: ConstructorParameters<typeof ChatEngine>[0] = {
  llmModel: 'gpt-4o-mini',
  tools: [],
  mode: 'user-project',
};
const router = Router();

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/chat/start', upload.array('file', 5), async (req, res) => {
  try {
    const { message } = req.body;
    const filesObj = req.files;
    const files = Array.isArray(filesObj) ? filesObj : undefined;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid message required' });
    }

    if (
      files &&
      files.length > 0 &&
      files.some((file) => {
        const mime = file.mimetype || '';
        const isImage = mime.startsWith('image/');
        return !isImage && !ALLOWED_MIME_TYPES.has(mime as AppMimeType);
      })
    ) {
      return res.status(400).json({
        error: 'Only image, PDF, Word, CSV, TXT, JSON files are supported',
      });
    }
    const chatEngine = new ChatEngine(baseEngineOptions);
    const agent = await chatEngine.initialize();

    const userMessage = await agent.createHumanMessage(message, files);
    const thread_id = agent.createUUID();
    const reply = await agent.runMessage(thread_id, userMessage);
    const data = getFormattedMessage(reply.toJSON(), thread_id);

    const chatName = await generateChatName(message, reply.content.toString());
    await agent.updateChatMetadata(thread_id, chatName, true);

    const responseWithChatName = {
      ...data,
      chat_name: chatName,
    };

    res.json(responseWithChatName);
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in /chat/start:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

router.post('/chat/continue', upload.array('file', 5), async (req, res) => {
  try {
    const { thread_id, message } = req.body;
    const filesObj = req.files;
    const files = Array.isArray(filesObj) ? filesObj : undefined;

    if (!thread_id || !message || typeof message !== 'string') {
      return res
        .status(400)
        .json({ error: 'thread_id and valid message required' });
    }

    if (
      files &&
      files.length > 0 &&
      files.some((file) => {
        const mime = file.mimetype || '';
        const isImage = mime.startsWith('image/');
        return !isImage && !ALLOWED_MIME_TYPES.has(mime as AppMimeType);
      })
    ) {
      return res.status(400).json({
        error: 'Only image, PDF, Word, CSV, TXT, JSON files are supported',
      });
    }
    const chatEngine = new ChatEngine(baseEngineOptions);
    const agent = await chatEngine.initialize();

    const userMessage = await agent.createHumanMessage(message, files);
    const reply = await agent.runMessage(thread_id, userMessage);
    const data = getFormattedMessage(reply.toJSON(), thread_id);

    await agent.updateChatMetadata(thread_id);

    res.json(data);
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in /chat/continue:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

router.get('/chat/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
    if (!thread_id) {
      return res.status(400).json({ error: 'thread_id required' });
    }

    const chatEngine = new ChatEngine(baseEngineOptions);
    const agent = await chatEngine.initialize();
    const threadDetails = await agent.getThreadDetails(thread_id);

    if (!threadDetails) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(threadDetails);
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in /chat/:thread_id:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

export default router;
