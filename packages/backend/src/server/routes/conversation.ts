import { Router, Request } from 'express';
import multer from 'multer';
import { ChatOpenAI } from '@langchain/openai';
import { getFormattedMessage } from '../utils/message-format';
import { tavilySearch } from '../chat-tools';
import { ALLOWED_MIME_TYPES, AppMimeType } from '../chat-manager/utils';
import { generateChatName } from '../chat-manager/generate-chat-name';
import { ChatEngine } from '../chat-manager/chat-engine';
import { serializeError } from '../utils/error';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
});

const baseEngineOptions: ConstructorParameters<typeof ChatEngine>[0] = {
  llmModel: 'gpt-4o-mini',
  tools: [tavilySearch],
  mode: 'user-chat',
};

const router = Router();

// Start a new chat
router.post('/chat/start', upload.array('file', 5), async (req, res) => {
  try {
    const { message, stream = 'false', model } = req.body;
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
    const isStream = stream === 'true';
    const chatEngine = new ChatEngine({
      ...baseEngineOptions,
      llmModel: model,
    });

    const agent = await chatEngine.initialize();

    const userMessage = await agent.createHumanMessage(message, files);
    const thread_id = agent.createUUID();

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      res.write(
        `data: ${JSON.stringify({ type: 'thread_id', thread_id })}\n\n`
      );

      try {
        for await (const chunk of agent.streamMessage(thread_id, userMessage)) {
          if (chunk.content) {
            fullResponse += chunk.content;
          }
          res.write(
            `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
          );
        }

        // Generate and store chat name after streaming completes
        const chatName = await generateChatName(message, fullResponse);
        await agent.updateChatMetadata(thread_id, chatName, true);

        res.write(
          `data: ${JSON.stringify({ type: 'done', thread_id, chat_name: chatName })}\n\n`
        );
        res.end();
      } catch (err) {
        const safeError = serializeError(err);
        console.error('Stream error in /chat/start:', safeError);
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: safeError.message })}\n\n`
        );
        res.end();
      }
    } else {
      // Non-streaming response
      const reply = await agent.runMessage(thread_id, userMessage);
      const data = getFormattedMessage(reply.toJSON(), thread_id);

      // Generate and store chat name
      const chatName = await generateChatName(
        message,
        reply.content.toString()
      );
      await agent.updateChatMetadata(thread_id, chatName, true);

      // Include chat name in response
      const responseWithChatName = {
        ...data,
        chat_name: chatName,
      };

      res.json(responseWithChatName);
    }
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in /chat/start:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

// Continue existing chat
router.post('/chat/continue', upload.array('file', 5), async (req, res) => {
  try {
    const { thread_id, message, stream = 'false', model } = req.body;
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
    const isStream = stream === 'true';
    const chatEngine = new ChatEngine({
      ...baseEngineOptions,
      llmModel: model,
    });
    const agent = await chatEngine.initialize();

    const userMessage = await agent.createHumanMessage(message, files);

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of agent.streamMessage(thread_id, userMessage)) {
          res.write(
            `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
          );
        }

        // Update chat metadata
        await agent.updateChatMetadata(thread_id);

        res.write(`data: ${JSON.stringify({ type: 'done', thread_id })}\n\n`);
        res.end();
      } catch (err) {
        const safeError = serializeError(err);
        console.error('Stream error in /chat/continue:', safeError);
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: safeError.message })}\n\n`
        );
        res.end();
      }
    } else {
      // Non-streaming response
      const reply = await agent.runMessage(thread_id, userMessage);
      const data = getFormattedMessage(reply.toJSON(), thread_id);

      // Update chat metadata
      await agent.updateChatMetadata(thread_id);

      res.json(data);
    }
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in /chat/continue:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

// Get specific chat with messages
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

// Get all chats list
router.get('/chats', async (req, res) => {
  try {
    const chatEngine = new ChatEngine(baseEngineOptions);
    const agent = await chatEngine.initialize();
    const chats = await agent.getThreadList();

    res.json({ chats });
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in /chats:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

// Update chat name
router.patch('/chat/:thread_id/name', async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { chat_name } = req.body;

    if (!thread_id || !chat_name || typeof chat_name !== 'string') {
      return res
        .status(400)
        .json({ error: 'thread_id and chat_name required' });
    }

    if (chat_name.length > 100) {
      return res.status(400).json({ error: 'Chat name too long' });
    }

    const chatEngine = new ChatEngine(baseEngineOptions);
    const agent = await chatEngine.initialize();

    await agent.updateChatMetadata(thread_id, chat_name, false);

    res.json({ success: true, thread_id, chat_name });
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error updating chat name:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

// Delete chat
router.delete('/chat/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
    if (!thread_id) {
      return res.status(400).json({ error: 'thread_id required' });
    }

    const chatEngine = new ChatEngine(baseEngineOptions);
    const agent = await chatEngine.initialize();

    await agent.deleteThread(thread_id);

    res.json({ success: true, deleted: thread_id });
  } catch (err: any) {
    const safeError = serializeError(err);
    console.error('Error in DELETE /chat/:thread_id:', safeError);
    res.status(500).json({ error: safeError.message });
  }
});

export default router;
