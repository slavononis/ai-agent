// import { Router, Request } from 'express';
// import multer from 'multer';
// import { ChatOpenAI } from '@langchain/openai';
// import {
//   START,
//   END,
//   MessagesAnnotation,
//   StateGraph,
// } from '@langchain/langgraph';
// import {
//   ChatPromptTemplate,
//   MessagesPlaceholder,
// } from '@langchain/core/prompts';
// import {
//   DataContentBlock,
//   MessageContentComplex,
//   trimMessages,
// } from '@langchain/core/messages';
// import { HumanMessage, AIMessage } from '@langchain/core/messages';
// import { v4 as uuidv4 } from 'uuid';
// import {
//   ChatMetadata,
//   type MessageModelDTO,
//   type MessageResponseDTO,
//   Role,
// } from '@monorepo/shared';
// import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
// import { initializeMongoDB } from '../lib/mongoDB';
// import { getFormattedMessage } from '../utils/message-format';
// import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
// import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
// import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
// import { TextLoader } from 'langchain/document_loaders/fs/text';
// import { JSONLoader } from 'langchain/document_loaders/fs/json';
// // @ts-ignore - Not support TS
// import { Blob } from 'blob-polyfill';
// import { ToolNode } from '@langchain/langgraph/prebuilt';
// import { weatherTool } from '../chat-tools';
// import { Document } from '@langchain/core/documents';
// import { Collection, Document as MongoDocument } from 'mongodb';

// let checkpointer: MongoDBSaver;
// let chatMetadataCollection: Collection<MongoDocument & ChatMetadata>;
// initializeMongoDB<ChatMetadata>().then((res) => {
//   checkpointer = res.checkpointer;
//   chatMetadataCollection = res.chatMetadataCollection;
// });

// const model = new ChatOpenAI({
//   model: 'gpt-4o-mini',
//   streaming: true,
// });

// const tools = [weatherTool];
// const llmWithTools = model.bindTools(tools);

// const promptTemplate = ChatPromptTemplate.fromMessages([
//   {
//     role: 'system',
//     content:
//       'You are a helpful assistant. Response must be in markdown format, use all abilities of markdown to show more structured content.',
//   },
//   new MessagesPlaceholder('messages'),
// ]);

// const trimmer = trimMessages({
//   maxTokens: 10000,
//   strategy: 'last',
//   tokenCounter: model,
//   includeSystem: true,
//   allowPartial: false,
// });

// const callModel = async (state: typeof MessagesAnnotation.State) => {
//   try {
//     const trimmedMessages = await trimmer.invoke(state.messages);
//     const prompt = await promptTemplate.invoke({ messages: trimmedMessages });
//     const response = await llmWithTools.invoke(prompt);

//     return { messages: [response] };
//   } catch (error) {
//     console.error('Error in callModel:', error);
//     throw error;
//   }
// };

// // Function to determine if we should continue to tools or end
// function shouldContinue(state: typeof MessagesAnnotation.State) {
//   const lastMessage = state.messages[state.messages.length - 1];

//   // If the last message has tool calls, route to tools
//   if (
//     lastMessage &&
//     'tool_calls' in lastMessage &&
//     Array.isArray(lastMessage.tool_calls) &&
//     lastMessage.tool_calls.length > 0
//   ) {
//     return 'tools';
//   }

//   // Otherwise, end the conversation
//   return END;
// }

// // Create a tool node that will execute the tools
// // @ts-ignore @ts-expect-error @ts-nocheck
// const toolNode = new ToolNode(tools as any);

// const workflow = new StateGraph(MessagesAnnotation)
//   .addNode('model', callModel)
//   .addNode('tools', toolNode)
//   .addEdge(START, 'model')
//   .addConditionalEdges('model', shouldContinue)
//   .addEdge('tools', 'model');

// let graph: ReturnType<(typeof workflow)['compile']>;

// async function initializeGraph() {
//   graph = workflow.compile({ checkpointer });
//   return graph;
// }

// const contentTypes = [
//   'image/jpeg',
//   'image/png',
//   'image/webp',
//   'application/pdf',
//   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//   'text/csv',
//   'text/plain',
//   'application/json',
// ] as const;

// type AppMimeType = (typeof contentTypes)[number];
// const ALLOWED_MIME_TYPES = new Set(contentTypes);

// async function createHumanMessage(
//   text: string,
//   files?: Express.Multer.File[]
// ): Promise<HumanMessage> {
//   const content: (MessageContentComplex | DataContentBlock)[] = [
//     { type: 'text', text: text },
//   ];

//   if (files) {
//     for (const file of files) {
//       const mime = (file.mimetype || '') as AppMimeType;
//       const isImage = mime.startsWith('image/');
//       const isAllowedDoc = ALLOWED_MIME_TYPES.has(mime as AppMimeType);

//       if (!isImage && !isAllowedDoc) {
//         continue;
//       }

//       if (isImage && file.buffer) {
//         const base64 = file.buffer.toString('base64');
//         content.push({
//           type: 'image_url',
//           image_url: { url: `data:${mime};base64,${base64}` },
//         });
//       } else {
//         try {
//           const buffer = file.buffer;
//           if (!buffer) continue;

//           const filename = file.originalname || 'unknown';
//           const blob = new Blob([buffer], { type: mime });
//           const createFileContent = (docs: Document<Record<string, any>>[]) => {
//             const extracted = docs
//               .map((doc: any) => doc.pageContent)
//               .join('\n\n');
//             content.push({
//               type: 'file',
//               filename,
//               text: `--- Content of ${filename} ---\n${extracted}`,
//             });
//           };
//           switch (mime) {
//             case 'application/pdf': {
//               const pdfLoader = new PDFLoader(blob, {
//                 pdfjs: () => import('pdfjs-dist/legacy/build/pdf.mjs'),
//               });
//               const docs = await pdfLoader.load();
//               createFileContent(docs);
//               break;
//             }

//             case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
//               const docxLoader = new DocxLoader(blob);
//               const docs = await docxLoader.load();
//               createFileContent(docs);
//               break;
//             }

//             case 'text/csv': {
//               const csvLoader = new CSVLoader(blob);
//               const docs = await csvLoader.load();
//               createFileContent(docs);
//               break;
//             }

//             case 'text/plain': {
//               const textLoader = new TextLoader(blob);
//               const docs = await textLoader.load();
//               createFileContent(docs);
//               break;
//             }

//             case 'application/json': {
//               const jsonLoader = new JSONLoader(blob);
//               const docs = await jsonLoader.load();
//               createFileContent(docs);
//               break;
//             }

//             default:
//               break;
//           }
//         } catch (e) {
//           console.error(`Error extracting ${file.originalname}:`, e);
//         }
//       }
//     }
//   }

//   return new HumanMessage({ content });
// }

// // Function to generate chat names
// async function generateChatName(
//   userMessage: string,
//   aiResponse?: string
// ): Promise<string> {
//   try {
//     const promptContent = aiResponse
//       ? `Based on this conversation, generate a short, descriptive chat title (max 5 words). User: "${userMessage.substring(0, 100)}" Assistant: "${aiResponse.substring(0, 100)}"`
//       : `Generate a short, descriptive title (max 5 words) for a chat starting with: "${userMessage.substring(0, 100)}"`;

//     const namingPrompt = ChatPromptTemplate.fromMessages([
//       {
//         role: 'system',
//         content:
//           'You are a helpful assistant that generates concise, descriptive chat titles. Respond with only the title, no additional text. Maximum 5 words.',
//       },
//       {
//         role: 'user',
//         content: promptContent,
//       },
//     ]);

//     const namingLlm = new ChatOpenAI({
//       model: 'gpt-3.5-turbo',
//       temperature: 0.7,
//     });

//     const response = await namingLlm.invoke(await namingPrompt.invoke({}));
//     let title = response.content.toString().trim();

//     // Clean up the title
//     title = title.replace(/["']/g, '').substring(0, 60);

//     return title || 'New Chat';
//   } catch (error) {
//     console.error('Error generating chat name:', error);
//     // Fallback: use first few words of user message
//     const words = userMessage.split(' ').slice(0, 4).join(' ');
//     return words || 'New Chat';
//   }
// }

// // Function to update chat metadata
// async function updateChatMetadata(
//   thread_id: string,
//   chat_name?: string,
//   isNewChat: boolean = false
// ): Promise<void> {
//   const now = new Date().toISOString();

//   if (isNewChat && chat_name) {
//     // Create new chat metadata
//     await chatMetadataCollection.updateOne(
//       { thread_id },
//       {
//         $set: {
//           thread_id,
//           chat_name,
//           created_at: now,
//           updated_at: now,
//           message_count: 1,
//         },
//       },
//       { upsert: true }
//     );
//   } else {
//     // Update existing chat
//     const updateData: any = {
//       $inc: { message_count: 1 },
//       $set: { updated_at: now },
//     };

//     if (chat_name) {
//       updateData.$set.chat_name = chat_name;
//     }

//     await chatMetadataCollection.updateOne({ thread_id }, updateData, {
//       upsert: true,
//     });
//   }
// }

// // Function to get chat metadata
// async function getChatMetadata(
//   thread_id: string
// ): Promise<ChatMetadata | null> {
//   return await chatMetadataCollection.findOne({ thread_id });
// }

// async function runMessage(thread_id: string, userMessage: HumanMessage) {
//   try {
//     if (!graph) {
//       await initializeGraph();
//     }

//     const config = { configurable: { thread_id } };
//     const input = { messages: [userMessage] };

//     const output = await graph.invoke(input, config);
//     return output.messages[output.messages.length - 1];
//   } catch (error) {
//     console.error('Error in runMessage:', error);
//     throw error;
//   }
// }

// // Streaming function
// async function* streamMessage(thread_id: string, userMessage: HumanMessage) {
//   try {
//     if (!graph) {
//       await initializeGraph();
//     }

//     const config = { configurable: { thread_id } };
//     const input = { messages: [userMessage] };

//     const stream = await graph.stream(input, {
//       ...config,
//       streamMode: 'messages',
//     });

//     for await (const [message, metadata] of stream) {
//       if (
//         message.constructor.name === Role.AIMessageChunk ||
//         (message as any).type === 'ai'
//       ) {
//         yield {
//           content: message.content,
//           role: Role.AIMessageChunk,
//           id: message.id,
//         };
//       }
//     }
//   } catch (error) {
//     console.error('Error in streamMessage:', error);
//     throw error;
//   }
// }

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 },
// });

// const router = Router();

// interface MulterRequest extends Request {
//   files?:
//     | Express.Multer.File[]
//     | { [fieldname: string]: Express.Multer.File[] };
// }

// // Start a new chat
// router.post(
//   '/chat/start',
//   upload.array('file', 5),
//   async (req: MulterRequest, res) => {
//     try {
//       const { message, stream = 'false' } = req.body;
//       const filesObj = req.files;
//       const files = Array.isArray(filesObj) ? filesObj : undefined;

//       if (!message || typeof message !== 'string') {
//         return res.status(400).json({ error: 'Valid message required' });
//       }

//       if (
//         files &&
//         files.length > 0 &&
//         files.some((file) => {
//           const mime = file.mimetype || '';
//           const isImage = mime.startsWith('image/');
//           return !isImage && !ALLOWED_MIME_TYPES.has(mime as AppMimeType);
//         })
//       ) {
//         return res.status(400).json({
//           error: 'Only image, PDF, Word, CSV, TXT, JSON files are supported',
//         });
//       }

//       const userMessage = await createHumanMessage(message, files);
//       const thread_id = uuidv4();
//       const isStream = stream === 'true';

//       if (isStream) {
//         res.setHeader('Content-Type', 'text/event-stream');
//         res.setHeader('Cache-Control', 'no-cache');
//         res.setHeader('Connection', 'keep-alive');

//         let fullResponse = '';

//         res.write(
//           `data: ${JSON.stringify({ type: 'thread_id', thread_id })}\n\n`
//         );

//         try {
//           for await (const chunk of streamMessage(thread_id, userMessage)) {
//             if (chunk.content) {
//               fullResponse += chunk.content;
//             }
//             res.write(
//               `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
//             );
//           }

//           // Generate and store chat name after streaming completes
//           const chatName = await generateChatName(message, fullResponse);
//           await updateChatMetadata(thread_id, chatName, true);

//           res.write(
//             `data: ${JSON.stringify({ type: 'done', thread_id, chat_name: chatName })}\n\n`
//           );
//           res.end();
//         } catch (err) {
//           res.write(
//             `data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`
//           );
//           res.end();
//         }
//       } else {
//         // Non-streaming response
//         const reply = await runMessage(thread_id, userMessage);
//         const data = getFormattedMessage(reply.toJSON(), thread_id);

//         // Generate and store chat name
//         const chatName = await generateChatName(
//           message,
//           reply.content.toString()
//         );
//         await updateChatMetadata(thread_id, chatName, true);

//         // Include chat name in response
//         const responseWithChatName = {
//           ...data,
//           chat_name: chatName,
//         };

//         res.json(responseWithChatName);
//       }
//     } catch (err: any) {
//       console.error('Error in /chat/start:', err);
//       res.status(500).json({ error: err.message });
//     }
//   }
// );

// // Continue existing chat
// router.post(
//   '/chat/continue',
//   upload.array('file', 5),
//   async (req: MulterRequest, res) => {
//     try {
//       const { thread_id, message, stream = 'false' } = req.body;
//       const filesObj = req.files;
//       const files = Array.isArray(filesObj) ? filesObj : undefined;

//       if (!thread_id || !message || typeof message !== 'string') {
//         return res
//           .status(400)
//           .json({ error: 'thread_id and valid message required' });
//       }

//       if (
//         files &&
//         files.length > 0 &&
//         files.some((file) => {
//           const mime = file.mimetype || '';
//           const isImage = mime.startsWith('image/');
//           return !isImage && !ALLOWED_MIME_TYPES.has(mime as AppMimeType);
//         })
//       ) {
//         return res.status(400).json({
//           error: 'Only image, PDF, Word, CSV, TXT, JSON files are supported',
//         });
//       }

//       const userMessage = await createHumanMessage(message, files);
//       const isStream = stream === 'true';

//       if (isStream) {
//         res.setHeader('Content-Type', 'text/event-stream');
//         res.setHeader('Cache-Control', 'no-cache');
//         res.setHeader('Connection', 'keep-alive');

//         try {
//           for await (const chunk of streamMessage(thread_id, userMessage)) {
//             res.write(
//               `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
//             );
//           }

//           // Update chat metadata
//           await updateChatMetadata(thread_id);

//           res.write(`data: ${JSON.stringify({ type: 'done', thread_id })}\n\n`);
//           res.end();
//         } catch (err) {
//           res.write(
//             `data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`
//           );
//           res.end();
//         }
//       } else {
//         // Non-streaming response
//         const reply = await runMessage(thread_id, userMessage);
//         const data = getFormattedMessage(reply.toJSON(), thread_id);

//         // Update chat metadata
//         await updateChatMetadata(thread_id);

//         res.json(data);
//       }
//     } catch (err: any) {
//       console.error('Error in /chat/continue:', err);
//       res.status(500).json({ error: err.message });
//     }
//   }
// );

// // Get specific chat with messages
// router.get('/chat/:thread_id', async (req, res) => {
//   try {
//     const { thread_id } = req.params;
//     if (!thread_id) {
//       return res.status(400).json({ error: 'thread_id required' });
//     }

//     if (!graph) {
//       await initializeGraph();
//     }

//     const config = { configurable: { thread_id } };
//     const { values } = await graph.getState(config);

//     if (!values) {
//       return res.status(404).json({ error: 'Chat not found' });
//     }

//     const messages: MessageResponseDTO[] = (
//       JSON.parse(JSON.stringify(values)).messages as MessageModelDTO[]
//     )
//       .map((msg) => {
//         return getFormattedMessage(msg, thread_id);
//       })
//       .filter((msg) => msg.role !== Role.ToolMessage && !!msg.content);

//     // Get chat metadata
//     const chatMetadata = await getChatMetadata(thread_id);

//     res.json({
//       thread_id,
//       chat_name: chatMetadata?.chat_name || 'New Chat',
//       created_at: chatMetadata?.created_at,
//       updated_at: chatMetadata?.updated_at,
//       message_count: chatMetadata?.message_count || messages.length,
//       messages: messages,
//     });
//   } catch (err: any) {
//     console.error('Error in /chat/:thread_id:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Get all chats list
// router.get('/chats', async (req, res) => {
//   try {
//     const chatMap = new Map<string, { thread_id: string; ts: string }>();

//     for await (const {
//       config,
//       checkpoint: { ts },
//     } of checkpointer.list({
//       configurable: {},
//     })) {
//       const threadId = config?.configurable?.thread_id;
//       if (threadId) {
//         if (!chatMap.has(threadId) || chatMap.get(threadId)!.ts < ts) {
//           chatMap.set(threadId, { thread_id: threadId, ts });
//         }
//       }
//     }

//     // Get chat metadata for all threads
//     const chatsWithMetadata = await Promise.all(
//       Array.from(chatMap.values()).map(async ({ thread_id, ts }) => {
//         const metadata = await getChatMetadata(thread_id);
//         return {
//           thread_id,
//           chat_name: metadata?.chat_name || 'New Chat',
//           created_at: metadata?.created_at,
//           updated_at: metadata?.updated_at || ts,
//           message_count: metadata?.message_count || 1,
//         };
//       })
//     );

//     // Sort by updated_at desc (latest first)
//     const sortedChats = chatsWithMetadata.sort(
//       (a, b) =>
//         new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
//     );

//     res.json({ chats: sortedChats });
//   } catch (err: any) {
//     console.error('Error in /chats:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Update chat name
// router.patch('/chat/:thread_id/name', async (req, res) => {
//   try {
//     const { thread_id } = req.params;
//     const { chat_name } = req.body;

//     if (!thread_id || !chat_name || typeof chat_name !== 'string') {
//       return res
//         .status(400)
//         .json({ error: 'thread_id and chat_name required' });
//     }

//     if (chat_name.length > 100) {
//       return res.status(400).json({ error: 'Chat name too long' });
//     }

//     await updateChatMetadata(thread_id, chat_name, false);

//     res.json({ success: true, thread_id, chat_name });
//   } catch (err: any) {
//     console.error('Error updating chat name:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Delete chat
// router.delete('/chat/:thread_id', async (req, res) => {
//   try {
//     const { thread_id } = req.params;
//     if (!thread_id) {
//       return res.status(400).json({ error: 'thread_id required' });
//     }

//     await checkpointer.deleteThread(thread_id);
//     await chatMetadataCollection.deleteOne({ thread_id });

//     res.json({ success: true, deleted: thread_id });
//   } catch (err: any) {
//     console.error('Error in DELETE /chat/:thread_id:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;
