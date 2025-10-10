// import { Router, Request } from 'express';
// import multer from 'multer';
// import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
// import {
//   START,
//   END,
//   MessagesAnnotation,
//   StateGraph,
// } from '@langchain/langgraph';
// import { trimMessages } from '@langchain/core/messages';
// import { HumanMessage, AIMessage } from '@langchain/core/messages';
// import { v4 as uuidv4 } from 'uuid';
// import {
//   ChatMetadata,
//   type MessageModelDTO,
//   type MessageResponseDTO,
//   MessagesResponseDTO,
//   Role,
// } from '@monorepo/shared';
// import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
// import { initializeMongoDB } from '../lib/mongoDB';
// import { getFormattedMessage } from '../utils/message-format';

// import { ToolNode } from '@langchain/langgraph/prebuilt';
// import { weatherTool } from '../chat-tools';
// import { Collection, Document as MongoDocument } from 'mongodb';

// import { ALLOWED_MIME_TYPES, AppMimeType } from '../chat-manager/utils';
// import { chatPromptTemplate } from '../chat-manager/prompt';
// import { createHumanMessage } from '../chat-manager/human-message';
// import { generateChatName } from '../chat-manager/generate-chat-name';

// import { ChatAnthropic } from '@langchain/anthropic';
// let checkpointer: MongoDBSaver;
// let chatMetadataCollection: Collection<MongoDocument & ChatMetadata>;
// // initializeMongoDB<ChatMetadata>().then((res) => {
// //   checkpointer = res.checkpointer;
// //   chatMetadataCollection = res.chatMetadataCollection;
// //   const chatEngine = new ChatEngine(
// //     new ChatOpenAI({
// //       model: 'gpt-4o-mini',
// //       streaming: true,
// //     }),
// //     {
// //       tools: [weatherTool],
// //       // checkpointer,
// //       // chatMetadataCollection,
// //     }
// //   );
// //   chatEngine.graph;
// // });

// class ChatEngine<
//   M extends
//     | ChatAnthropic
//     | ChatOpenAI<ChatOpenAICallOptions> = ChatOpenAI<ChatOpenAICallOptions>,
// > {
//   protected model: M;
//   protected tools: any[] = [];
//   private checkpointer: MongoDBSaver | null = null;
//   private chatMetadataCollection: Collection<
//     MongoDocument & ChatMetadata
//   > | null = null;
//   constructor(
//     model: M,
//     {
//       tools,
//     }: {
//       tools: any[];
//       // checkpointer: MongoDBSaver;
//       // chatMetadataCollection: Collection<MongoDocument & ChatMetadata>;
//     }
//   ) {
//     this.model = model;
//     this.tools = tools;
//     this.checkpointer = null;
//     this.chatMetadataCollection = null;
//   }

//   async initialize() {
//     const res = await initializeMongoDB<ChatMetadata>();
//     this.checkpointer = res.checkpointer;
//     this.chatMetadataCollection = res.chatMetadataCollection;
//     return this;
//   }

//   get trimmer() {
//     return trimMessages({
//       maxTokens: 10000,
//       strategy: 'last',
//       tokenCounter: this.model,
//       includeSystem: true,
//       allowPartial: false,
//     });
//   }
//   get llmWithTools() {
//     return this.model.bindTools(this.tools);
//   }

//   async callModel(state: typeof MessagesAnnotation.State) {
//     try {
//       const trimmedMessages = await this.trimmer.invoke(state.messages);
//       const prompt = await chatPromptTemplate.invoke({
//         messages: trimmedMessages,
//       });
//       const response = await this.llmWithTools.invoke(prompt);

//       return { messages: [response] };
//     } catch (error) {
//       console.error('Error in callModel:', error);
//       throw error;
//     }
//   }

//   shouldContinue(state: typeof MessagesAnnotation.State) {
//     const lastMessage = state.messages[state.messages.length - 1];

//     // If the last message has tool calls, route to tools
//     if (
//       lastMessage &&
//       'tool_calls' in lastMessage &&
//       Array.isArray(lastMessage.tool_calls) &&
//       lastMessage.tool_calls.length > 0
//     ) {
//       return 'tools';
//     }

//     // Otherwise, end the conversation
//     return END;
//   }

//   get workflow() {
//     return new StateGraph(MessagesAnnotation)
//       .addNode('model', this.callModel)
//       .addNode('tools', new ToolNode(this.tools))
//       .addEdge(START, 'model')
//       .addConditionalEdges('model', this.shouldContinue)
//       .addEdge('tools', 'model');
//   }

//   get graph() {
//     return this.workflow.compile({ checkpointer: this.checkpointer! });
//   }

//   config(thread_id: string) {
//     return { configurable: { thread_id } };
//   }

//   userInput(message: HumanMessage) {
//     return { messages: [message] };
//   }

//   async runMessage(thread_id: string, userMessage: HumanMessage) {
//     try {
//       const config = this.config(thread_id);
//       const input = this.userInput(userMessage);

//       const output = await this.graph.invoke(input, config);
//       const lastMessage = output.messages[output.messages.length - 1];
//       return lastMessage;
//     } catch (error) {
//       console.error('Error in runMessage:', error);
//       throw error;
//     }
//   }

//   async *streamMessage(thread_id: string, userMessage: HumanMessage) {
//     try {
//       const config = this.config(thread_id);
//       const input = this.userInput(userMessage);

//       const stream = await this.graph.stream(input, {
//         ...config,
//         streamMode: 'messages',
//       });

//       for await (const [message, metadata] of stream) {
//         if (
//           message.constructor.name === Role.AIMessageChunk ||
//           (message as any).type === 'ai'
//         ) {
//           yield {
//             content: message.content,
//             role: Role.AIMessageChunk,
//             id: message.id,
//           };
//         }
//       }
//     } catch (error) {
//       console.error('Error in streamMessage:', error);
//       throw error;
//     }
//   }
//   async updateChatMetadata(
//     thread_id: string,
//     chat_name?: string,
//     isNewChat: boolean = false
//   ): Promise<void> {
//     const now = new Date().toISOString();

//     if (isNewChat && chat_name) {
//       // Create new chat metadata
//       await this.chatMetadataCollection?.updateOne(
//         { thread_id },
//         {
//           $set: {
//             thread_id,
//             chat_name,
//             created_at: now,
//             updated_at: now,
//             message_count: 1,
//           },
//         },
//         { upsert: true }
//       );
//     } else {
//       // Update existing chat
//       const updateData: any = {
//         $inc: { message_count: 1 },
//         $set: { updated_at: now },
//       };

//       if (chat_name) {
//         updateData.$set.chat_name = chat_name;
//       }

//       await this.chatMetadataCollection?.updateOne({ thread_id }, updateData, {
//         upsert: true,
//       });
//     }
//   }

//   async getChatMetadata(
//     thread_id: string
//   ): Promise<ChatMetadata | null | undefined> {
//     return await this.chatMetadataCollection?.findOne({ thread_id });
//   }

//   async createHumanMessage(
//     text: string,
//     files?: Express.Multer.File[] | undefined
//   ) {
//     return await createHumanMessage(text, files);
//   }

//   createUUID() {
//     return uuidv4();
//   }

//   getStateValues(values: any, thread_id: string): MessageResponseDTO[] {
//     return (JSON.parse(JSON.stringify(values)).messages as MessageModelDTO[])
//       .map((msg) => {
//         return getFormattedMessage(msg, thread_id);
//       })
//       .filter((msg) => msg.role !== Role.ToolMessage && !!msg.content);
//   }

//   async getThreadDetails(
//     thread_id: string
//   ): Promise<(MessagesResponseDTO & ChatMetadata) | null> {
//     const config = this.config(thread_id);
//     const { values } = await this.graph.getState(config);

//     if (!values) {
//       return null;
//     }

//     const messages = this.getStateValues(values, thread_id);

//     // Get chat metadata
//     const chatMetadata = await this.getChatMetadata(thread_id);

//     return {
//       thread_id,
//       chat_name: chatMetadata?.chat_name || 'New Chat',
//       created_at: chatMetadata?.created_at!,
//       updated_at: chatMetadata?.updated_at!,
//       message_count: chatMetadata?.message_count || messages.length,
//       messages: messages,
//     };
//   }

//   async getThreadList(): Promise<ChatMetadata[]> {
//     if (!this.checkpointer) {
//       return [];
//     }

//     const chatMap = new Map<string, { thread_id: string; ts: string }>();

//     for await (const { config, checkpoint } of this.checkpointer?.list({
//       configurable: {},
//     })) {
//       const ts = checkpoint.ts;
//       const threadId = config?.configurable?.thread_id;
//       if (threadId) {
//         if (!chatMap.has(threadId) || chatMap.get(threadId)!.ts < ts) {
//           chatMap.set(threadId, { thread_id: threadId, ts });
//         }
//       }
//     }

//     const chatsWithMetadata = await Promise.all(
//       Array.from(chatMap.values()).map(async ({ thread_id, ts }) => {
//         const metadata = await this.getChatMetadata(thread_id);
//         return {
//           thread_id,
//           chat_name: metadata?.chat_name || 'New Chat',
//           created_at: metadata?.created_at!,
//           updated_at: metadata?.updated_at! || ts,
//           message_count: metadata?.message_count || 1,
//         };
//       })
//     );

//     // Sort by updated_at desc (latest first)
//     const sortedChats = chatsWithMetadata.sort(
//       (a, b) =>
//         new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
//     );

//     return sortedChats;
//   }

//   async deleteThread(thread_id: string) {
//     await this.checkpointer?.deleteThread(thread_id);
//     await this.chatMetadataCollection?.deleteOne({ thread_id });
//   }
// }

// const upload = multer({
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
//       const isStream = stream === 'true';
//       const chatEngine = new ChatEngine(
//         new ChatOpenAI({
//           model: 'gpt-4o-mini',
//           streaming: isStream,
//         }),
//         {
//           tools: [weatherTool],
//         }
//       );

//       const agent = await chatEngine.initialize();

//       const userMessage = await agent.createHumanMessage(message, files);
//       const thread_id = agent.createUUID();

//       if (isStream) {
//         res.setHeader('Content-Type', 'text/event-stream');
//         res.setHeader('Cache-Control', 'no-cache');
//         res.setHeader('Connection', 'keep-alive');

//         let fullResponse = '';

//         res.write(
//           `data: ${JSON.stringify({ type: 'thread_id', thread_id })}\n\n`
//         );

//         try {
//           for await (const chunk of agent.streamMessage(
//             thread_id,
//             userMessage
//           )) {
//             if (chunk.content) {
//               fullResponse += chunk.content;
//             }
//             res.write(
//               `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
//             );
//           }

//           // Generate and store chat name after streaming completes
//           const chatName = await generateChatName(message, fullResponse);
//           await agent.updateChatMetadata(thread_id, chatName, true);

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
//         const reply = await agent.runMessage(thread_id, userMessage);
//         const data = getFormattedMessage(reply.toJSON(), thread_id);

//         // Generate and store chat name
//         const chatName = await generateChatName(
//           message,
//           reply.content.toString()
//         );
//         await agent.updateChatMetadata(thread_id, chatName, true);

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
//       const isStream = stream === 'true';
//       const chatEngine = new ChatEngine(
//         new ChatOpenAI({
//           model: 'gpt-4o-mini',
//           streaming: isStream,
//         }),
//         {
//           tools: [weatherTool],
//         }
//       );
//       const agent = await chatEngine.initialize();

//       const userMessage = await agent.createHumanMessage(message, files);

//       if (isStream) {
//         res.setHeader('Content-Type', 'text/event-stream');
//         res.setHeader('Cache-Control', 'no-cache');
//         res.setHeader('Connection', 'keep-alive');

//         try {
//           for await (const chunk of agent.streamMessage(
//             thread_id,
//             userMessage
//           )) {
//             res.write(
//               `data: ${JSON.stringify({ type: 'chunk', ...chunk, thread_id })}\n\n`
//             );
//           }

//           // Update chat metadata
//           await agent.updateChatMetadata(thread_id);

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
//         const reply = await agent.runMessage(thread_id, userMessage);
//         const data = getFormattedMessage(reply.toJSON(), thread_id);

//         // Update chat metadata
//         await agent.updateChatMetadata(thread_id);

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

//     const chatEngine = new ChatEngine(
//       new ChatOpenAI({
//         model: 'gpt-4o-mini',
//         streaming: false,
//       }),
//       {
//         tools: [weatherTool],
//       }
//     );
//     const agent = await chatEngine.initialize();
//     const threadDetails = await agent.getThreadDetails(thread_id);

//     if (!threadDetails) {
//       return res.status(404).json({ error: 'Chat not found' });
//     }

//     res.json(threadDetails);
//   } catch (err: any) {
//     console.error('Error in /chat/:thread_id:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Get all chats list
// router.get('/chats', async (req, res) => {
//   try {
//     const chatEngine = new ChatEngine(
//       new ChatOpenAI({
//         model: 'gpt-4o-mini',
//         streaming: false,
//       }),
//       {
//         tools: [weatherTool],
//       }
//     );
//     const agent = await chatEngine.initialize();
//     const chats = await agent.getThreadList();

//     res.json({ chats });
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

//     const chatEngine = new ChatEngine(
//       new ChatOpenAI({
//         model: 'gpt-4o-mini',
//         streaming: false,
//       }),
//       {
//         tools: [weatherTool],
//       }
//     );
//     const agent = await chatEngine.initialize();

//     await agent.updateChatMetadata(thread_id, chat_name, false);

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

//     const chatEngine = new ChatEngine(
//       new ChatOpenAI({
//         model: 'gpt-4o-mini',
//         streaming: false,
//       }),
//       {
//         tools: [weatherTool],
//       }
//     );
//     const agent = await chatEngine.initialize();

//     await agent.deleteThread(thread_id);

//     res.json({ success: true, deleted: thread_id });
//   } catch (err: any) {
//     console.error('Error in DELETE /chat/:thread_id:', err);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;
