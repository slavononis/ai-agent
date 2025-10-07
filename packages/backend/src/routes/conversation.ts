import { Router, Request } from 'express';
import multer from 'multer';
import { ChatOpenAI } from '@langchain/openai';
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
} from '@langchain/langgraph';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { trimMessages } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import {
  type MessageModelDTO,
  type MessageResponseDTO,
  Role,
} from '@monorepo/shared';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import dbConnect from '../lib/mongoDB';
import { getFormattedMessage } from '../utils/message-format';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
// @ts-ignore - Not support TS
import { Blob } from 'blob-polyfill'; // Updated import here

let checkpointer: MongoDBSaver;

async function initializeMongoDB() {
  try {
    const client = await dbConnect();

    const dbName = 'user-chat-checkpoint';
    checkpointer = new MongoDBSaver({ client, dbName });

    return { client, checkpointer };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

const llm = new ChatOpenAI({
  model: 'gpt-5-nano',
  streaming: true, // Enable streaming
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  {
    role: 'system',
    content:
      'You are a helpful assistant. Response must be in markdown format, use all abilities of markdown to show more structured content.',
  },
  new MessagesPlaceholder('messages'),
]);

const trimmer = trimMessages({
  maxTokens: 10000,
  strategy: 'last',
  tokenCounter: llm,
  includeSystem: true,
  allowPartial: false,
});

const callModel = async (state: typeof MessagesAnnotation.State) => {
  try {
    const trimmedMessages = await trimmer.invoke(state.messages);
    console.log('Trimmed Messages (for debugging):', trimmedMessages);
    const prompt = await promptTemplate.invoke({ messages: trimmedMessages });
    const response = await llm.invoke(prompt);

    return { messages: [response] };
  } catch (error) {
    console.error('Error in callModel:', error);
    throw error;
  }
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode('model', callModel)
  .addEdge(START, 'model')
  .addEdge('model', END);

let graph: ReturnType<(typeof workflow)['compile']>;

// Initialize the graph with checkpointer
async function initializeGraph() {
  if (!checkpointer) {
    await initializeMongoDB();
  }
  graph = workflow.compile({ checkpointer });
  return graph;
}

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

type AppMimeType = (typeof contentTypes)[number];
const ALLOWED_MIME_TYPES = new Set(contentTypes);

async function createHumanMessage(
  text: string,
  files?: Express.Multer.File[]
): Promise<HumanMessage> {
  let fullText = text;
  const content: Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }> = [{ type: 'text', text: fullText }];

  if (files) {
    for (const file of files) {
      const mime = file.mimetype || '';
      const isImage = mime.startsWith('image/');
      const isAllowedDoc = ALLOWED_MIME_TYPES.has(mime as AppMimeType);

      if (!isImage && !isAllowedDoc) {
        continue; // Skip unsupported
      }

      if (isImage && file.buffer) {
        // Handle images as base64
        const base64 = file.buffer.toString('base64');
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${base64}` },
        });
      } else {
        let extracted = '';
        try {
          const buffer = file.buffer;
          if (!buffer) continue;

          const filename = file.originalname || 'unknown';
          const blob = new Blob([buffer], { type: mime }); // Convert buffer to Blob

          let loader: any;
          if (mime === 'application/pdf') {
            loader = new PDFLoader(blob, {
              pdfjs: () => import('pdfjs-dist/legacy/build/pdf.mjs'),
            });
          } else if (
            mime ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ) {
            loader = new DocxLoader(blob);
          } else if (mime === 'text/csv') {
            loader = new CSVLoader(blob);
          } else if (mime === 'text/plain') {
            loader = new TextLoader(blob);
          } else if (mime === 'application/json') {
            loader = new JSONLoader(blob);
          }

          if (loader) {
            const docs = await loader.load();
            extracted = docs.map((doc: any) => doc.pageContent).join('\n\n');
          }

          if (extracted) {
            content.push({
              type: 'text',
              text: `\n\n--- Content of ${filename} ---\n${extracted}`,
            });
          }
        } catch (e) {
          console.error(`Error extracting ${file.originalname}:`, e);
        }
      }
    }
  }

  // Merge all text parts into one coherent message
  fullText = content
    .filter(
      (part): part is { type: 'text'; text: string } => part.type === 'text'
    )
    .map((part) => part.text)
    .join('\n\n');

  content[0].text = fullText; // Update the initial text with merged content
  // Remove duplicate text parts, keep images only
  const imageParts = content.filter((part) => part.type === 'image_url');
  content.splice(1, content.length); // Clear after first text
  content.push(...imageParts); // Add images back

  return new HumanMessage({ content });
}

async function runMessage(thread_id: string, userMessage: HumanMessage) {
  try {
    if (!graph) {
      await initializeGraph();
    }

    const config = { configurable: { thread_id } };
    const input = { messages: [userMessage] };

    const output = await graph.invoke(input, config);
    return output.messages[output.messages.length - 1];
  } catch (error) {
    console.error('Error in runMessage:', error);
    throw error;
  }
}

// New streaming function
async function* streamMessage(thread_id: string, userMessage: HumanMessage) {
  try {
    if (!graph) {
      await initializeGraph();
    }

    const config = { configurable: { thread_id } };
    const input = { messages: [userMessage] };

    // Stream the graph execution
    const stream = await graph.stream(input, {
      ...config,
      streamMode: 'messages',
    });

    for await (const [message, metadata] of stream) {
      // Only yield assistant messages (skip user messages)
      if (
        message.constructor.name === Role.AIMessageChunk ||
        (message as any).type === 'ai'
      ) {
        yield {
          content: message.content,
          role: Role.AIMessageChunk,
          id: message.id,
        };
      }
    }
  } catch (error) {
    console.error('Error in streamMessage:', error);
    throw error;
  }
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

const router = Router();

// Initialize MongoDB on startup
initializeMongoDB().catch(console.error);

interface MulterRequest extends Request {
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

router.post(
  '/chat/start',
  upload.array('file', 5),
  async (req: MulterRequest, res) => {
    try {
      const { message, stream = 'false' } = req.body;
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

      const userMessage = await createHumanMessage(message, files);
      const thread_id = uuidv4();

      const isStream = stream === 'true';

      if (isStream) {
        // Set headers for SSE (Server-Sent Events)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send thread_id first
        res.write(
          `data: ${JSON.stringify({ type: 'thread_id', thread_id })}\n\n`
        );

        try {
          for await (const chunk of streamMessage(thread_id, userMessage)) {
            res.write(
              `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
            );
          }
          res.write(`data: ${JSON.stringify({ type: 'done', thread_id })}\n\n`);
          res.end();
        } catch (err) {
          res.write(
            `data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`
          );
          res.end();
        }
      } else {
        // Non-streaming response (original behavior)
        const reply = await runMessage(thread_id, userMessage);
        const data = getFormattedMessage(reply.toJSON(), thread_id);
        res.json(data);
      }
    } catch (err: any) {
      console.error('Error in /chat/start:', err);
      res.status(500).json(err);
    }
  }
);

router.post(
  '/chat/continue',
  upload.array('file', 5),
  async (req: MulterRequest, res) => {
    try {
      const { thread_id, message, stream = 'false' } = req.body;
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

      const userMessage = await createHumanMessage(message, files);

      const isStream = stream === 'true';

      if (isStream) {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          for await (const chunk of streamMessage(thread_id, userMessage)) {
            res.write(
              `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
            );
          }
          res.write(`data: ${JSON.stringify({ type: 'done', thread_id })}\n\n`);
          res.end();
        } catch (err) {
          res.write(
            `data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`
          );
          res.end();
        }
      } else {
        // Non-streaming response (original behavior)
        const reply = await runMessage(thread_id, userMessage);
        const data = getFormattedMessage(reply.toJSON(), thread_id);
        res.json(data);
      }
    } catch (err: any) {
      console.error('Error in /chat/continue:', err);
      res.status(500).json(err);
    }
  }
);

router.get('/chat/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
    if (!thread_id) {
      return res.status(400).json({ error: 'thread_id required' });
    }

    if (!graph) {
      await initializeGraph();
    }

    const config = { configurable: { thread_id } };

    const { values } = await graph.getState(config);

    if (!values) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messages: MessageResponseDTO[] = (
      JSON.parse(JSON.stringify(values)).messages as MessageModelDTO[]
    ).map((msg) => {
      return getFormattedMessage(msg, thread_id);
    });

    res.json({
      thread_id,
      messages: messages,
    });
  } catch (err: any) {
    console.error('Error in /chat/:thread_id:', err);
    res.status(500).json(err);
  }
});

router.get('/chats', async (req, res) => {
  try {
    if (!checkpointer) {
      await initializeMongoDB();
    }

    const chatMap = new Map<string, { thread_id: string; ts: string }>();

    for await (const {
      config,
      checkpoint: { ts },
    } of checkpointer.list({
      configurable: {},
    })) {
      const threadId = config?.configurable?.thread_id;
      if (threadId) {
        // keep only the latest ts per thread
        if (!chatMap.has(threadId) || chatMap.get(threadId)!.ts < ts) {
          chatMap.set(threadId, { thread_id: threadId, ts });
        }
      }
    }

    // convert to array and sort by ts desc (latest first)
    const chats = Array.from(chatMap.values()).sort(
      (a, b) => (b.ts as any) - (a.ts as any)
    );

    res.json({ chats });
  } catch (err: any) {
    console.error('Error in /chats:', err);
    res.status(500).json(err);
  }
});

router.delete('/chat/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
    if (!thread_id) {
      return res.status(400).json({ error: 'thread_id required' });
    }

    if (!checkpointer) {
      await initializeMongoDB();
    }

    await checkpointer.deleteThread(thread_id);

    res.json({ success: true, deleted: thread_id });
  } catch (err: any) {
    console.error('Error in DELETE /chat/:thread_id:', err);
    res.status(500).json(err);
  }
});

process.on('SIGINT', async () => {
  await (await dbConnect()).close();

  process.exit(0);
});

export default router;
