import {
  END,
  START,
  StateGraph,
  MessagesAnnotation,
} from '@langchain/langgraph';
import {
  Role,
  ChatMetadata,
  MessagesResponseDTO,
  type MessageModelDTO,
  type MessageResponseDTO,
} from '@monorepo/shared';
import { v4 as uuidv4 } from 'uuid';
import { isAIMessage, trimMessages } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { Collection, Document as MongoDocument } from 'mongodb';
import { HumanMessage } from '@langchain/core/messages';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';

import { initializeMongoDB } from '../lib/mongoDB';
import { getFormattedMessage } from '../utils/message-format';
import { chatPromptTemplate, projectPromptTemplate } from './prompt';
import { createHumanMessage } from './human-message';
import { ProviderManager } from './model-manager';

export class ChatEngine {
  protected model: ProviderManager['provider'];
  protected tools: any[] = [];
  private checkpointer: MongoDBSaver | null = null;
  protected mode: Parameters<typeof initializeMongoDB>[0] = 'user-chat';
  public isStreaming: boolean = false;
  private chatMetadataCollection: Collection<
    MongoDocument & ChatMetadata
  > | null = null;

  constructor(
    public params: {
      tools: any[];
      llmModel: ProviderManager['model'];
      mode?: Parameters<typeof initializeMongoDB>[0];
    }
  ) {
    const { llmModel = 'gpt-4o-mini', tools, mode = 'user-chat' } = params;
    this.model = new ProviderManager(llmModel).provider;
    this.mode = mode;
    this.tools = tools;
    this.checkpointer = null;
    this.chatMetadataCollection = null;
    this.isStreaming = this.model.streaming;

    // Bind methods to preserve 'this' context
    this.callModel = this.callModel.bind(this);
    this.shouldContinue = this.shouldContinue.bind(this);
  }

  async initialize() {
    const res = await initializeMongoDB<ChatMetadata>(this.mode);
    this.checkpointer = res.checkpointer;
    this.chatMetadataCollection = res.chatMetadataCollection;
    return this;
  }

  get trimmer() {
    return trimMessages({
      maxTokens: 10000,
      strategy: 'last',
      tokenCounter: this.model,
      includeSystem: true,
      allowPartial: false,
    });
  }

  get llmWithTools() {
    return this.model.bindTools(this.tools);
  }

  // Use arrow function to preserve 'this' context, or keep bound method
  async callModel(state: typeof MessagesAnnotation.State) {
    try {
      const trimmedMessages = await this.trimmer.invoke(state.messages);
      const currentPrompt =
        this.mode === 'user-chat' ? chatPromptTemplate : projectPromptTemplate;
      const prompt = await currentPrompt.invoke({
        messages: trimmedMessages,
      });

      const response = await this.llmWithTools.invoke(prompt);

      return { messages: [response] };
    } catch (error) {
      console.error('Error in callModel:', error);
      throw error;
    }
  }

  // Use arrow function to preserve 'this' context
  shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];

    // If the last message has tool calls, route to tools
    if (
      lastMessage &&
      'tool_calls' in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'tools';
    }

    // Otherwise, end the conversation
    return END;
  }

  get workflow() {
    return new StateGraph(MessagesAnnotation)
      .addNode('model', this.callModel)
      .addNode('tools', new ToolNode(this.tools))
      .addEdge(START, 'model')
      .addConditionalEdges('model', this.shouldContinue)
      .addEdge('tools', 'model');
  }

  get graph() {
    if (!this.checkpointer) {
      throw new Error('ChatEngine not initialized. Call initialize() first.');
    }
    return this.workflow.compile({ checkpointer: this.checkpointer });
  }

  config(thread_id: string) {
    return { configurable: { thread_id } };
  }

  userInput(message: HumanMessage) {
    return { messages: [message] };
  }

  async runMessage(thread_id: string, userMessage: HumanMessage) {
    try {
      const config = this.config(thread_id);
      const input = this.userInput(userMessage);

      const output = await this.graph.invoke(input, config);
      const lastMessage = output.messages[output.messages.length - 1];
      return lastMessage;
    } catch (error) {
      console.error('Error in runMessage:', error);
      throw error;
    }
  }

  async *runMessageChunk(thread_id: string, userMessage: HumanMessage) {
    try {
      const config = this.config(thread_id);
      const input = this.userInput(userMessage);

      const output = await this.graph.invoke(input, config);
      const lastMessageRaw = output.messages[output.messages.length - 1];

      if (isAIMessage(lastMessageRaw)) {
        const lastMessage = Array.isArray(lastMessageRaw.content)
          ? lastMessageRaw.content?.[0]?.type === 'text'
            ? (lastMessageRaw.content?.[0]?.text as string)
            : ''
          : lastMessageRaw.content;

        // Emulate streaming by splitting into parts that preserve original whitespace/formatting
        const parts = lastMessage.split(/(\s+)/);
        const chunkSize = 5; // Number of words per chunk; adjust as needed
        const delayMs = 100; // Delay between chunks in ms; adjust for pacing (e.g., 50 for faster, 200 for slower)

        let chunkStart = 0;
        while (chunkStart < parts.length) {
          const chunkParts: string[] = [];
          let wordsInChunk = 0;
          let chunkEnd = chunkStart;

          // Collect up to chunkSize words and the whitespace between them
          while (chunkEnd < parts.length && wordsInChunk < chunkSize) {
            const part = parts[chunkEnd];
            chunkParts.push(part);
            if (!/\s/.test(part)) {
              // It's a non-whitespace part (word)
              wordsInChunk++;
            }
            chunkEnd++;
          }

          // If we hit exactly chunkSize words and ended on a word (with potential following whitespace),
          // include the next whitespace separator if it's not the end
          if (
            wordsInChunk === chunkSize &&
            chunkEnd < parts.length &&
            /\s/.test(parts[chunkEnd])
          ) {
            chunkParts.push(parts[chunkEnd]);
            chunkEnd++;
          }

          // Only yield if we have some content (e.g., skip pure whitespace chunks)
          const chunkContent = chunkParts.join('');
          if (chunkContent.trim().length > 0 || chunkParts.length > 0) {
            yield {
              content: chunkContent,
              role: Role.AIMessageChunk,
              id: lastMessageRaw.id, // Reuse the same ID across chunks
            };
          }

          chunkStart = chunkEnd;

          // Add delay between chunks to simulate real-time streaming (skip for last chunk if desired)
          if (chunkStart < parts.length) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
    } catch (error) {
      console.error('Error in runMessage:', error);
      throw error;
    }
  }
  async *streamMessage(thread_id: string, userMessage: HumanMessage) {
    try {
      const config = this.config(thread_id);
      const input = this.userInput(userMessage);

      const stream = await this.graph.stream(input, {
        ...config,
        streamMode: 'messages',
      });

      for await (const [rawMessage] of stream) {
        if (isAIMessage(rawMessage)) {
          const message = Array.isArray(rawMessage.content)
            ? rawMessage.content?.[0]?.type === 'text'
              ? (rawMessage.content?.[0]?.text as string)
              : ''
            : rawMessage.content;
          yield {
            content: message,
            role: Role.AIMessageChunk,
            id: rawMessage.id,
          };
        }
      }
    } catch (error) {
      console.error('Error in streamMessage:', error);
      throw error;
    }
  }

  async updateChatMetadata(
    thread_id: string,
    chat_name?: string,
    isNewChat: boolean = false
  ): Promise<void> {
    const now = new Date().toISOString();

    if (isNewChat && chat_name) {
      // Create new chat metadata
      await this.chatMetadataCollection?.updateOne(
        { thread_id },
        {
          $set: {
            thread_id,
            chat_name,
            created_at: now,
            updated_at: now,
            message_count: 1,
          },
        },
        { upsert: true }
      );
    } else {
      // Update existing chat
      const updateData: any = {
        $inc: { message_count: 1 },
        $set: { updated_at: now },
      };

      if (chat_name) {
        updateData.$set.chat_name = chat_name;
      }

      await this.chatMetadataCollection?.updateOne({ thread_id }, updateData, {
        upsert: true,
      });
    }
  }

  async getChatMetadata(
    thread_id: string
  ): Promise<ChatMetadata | null | undefined> {
    return await this.chatMetadataCollection?.findOne({ thread_id });
  }

  async createHumanMessage(
    text: string,
    files?: Express.Multer.File[] | undefined
  ) {
    return await createHumanMessage(text, files);
  }

  createUUID() {
    return uuidv4();
  }

  getStateValues(values: any, thread_id: string): MessageResponseDTO[] {
    return (JSON.parse(JSON.stringify(values)).messages as MessageModelDTO[])
      .map((msg) => {
        return getFormattedMessage(msg, thread_id);
      })
      .filter((msg) => msg.role !== Role.ToolMessage && !!msg.content);
  }

  async getThreadDetails(
    thread_id: string
  ): Promise<(MessagesResponseDTO & ChatMetadata) | null> {
    const config = this.config(thread_id);
    const { values } = await this.graph.getState(config);

    if (!values) {
      return null;
    }

    const messages = this.getStateValues(values, thread_id);

    // Get chat metadata
    const chatMetadata = await this.getChatMetadata(thread_id);

    return {
      thread_id,
      chat_name: chatMetadata?.chat_name || 'New Chat',
      created_at: chatMetadata?.created_at!,
      updated_at: chatMetadata?.updated_at!,
      message_count: chatMetadata?.message_count || messages.length,
      messages: messages,
    };
  }

  async getThreadList(): Promise<ChatMetadata[]> {
    if (!this.checkpointer) {
      return [];
    }

    const chatMap = new Map<string, { thread_id: string; ts: string }>();

    for await (const { config, checkpoint } of this.checkpointer?.list({
      configurable: {},
    })) {
      const ts = checkpoint.ts;
      const threadId = config?.configurable?.thread_id;
      if (threadId) {
        if (!chatMap.has(threadId) || chatMap.get(threadId)!.ts < ts) {
          chatMap.set(threadId, { thread_id: threadId, ts });
        }
      }
    }

    const chatsWithMetadata = await Promise.all(
      Array.from(chatMap.values()).map(async ({ thread_id, ts }) => {
        const metadata = await this.getChatMetadata(thread_id);
        return {
          thread_id,
          chat_name: metadata?.chat_name || 'New Chat',
          created_at: metadata?.created_at!,
          updated_at: metadata?.updated_at! || ts,
          message_count: metadata?.message_count || 1,
        };
      })
    );

    // Sort by updated_at desc (latest first)
    const sortedChats = chatsWithMetadata.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return sortedChats;
  }

  async deleteThread(thread_id: string) {
    await this.checkpointer?.deleteThread(thread_id);
    await this.chatMetadataCollection?.deleteOne({ thread_id });
  }
}
