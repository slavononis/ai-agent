import { Router } from 'express';
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
import { v4 as uuidv4 } from 'uuid';
import { MessageModelDTO, MessageResponseDTO } from '@monorepo/shared';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import dbConnect from '../lib/mongoDB';
import { getFormattedMessage } from '../utils/message-format';

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
  model: 'gpt-5',
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  {
    role: 'system',
    content: 'You are a helpful assistant.',
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

async function runMessage(thread_id: string, text: string) {
  try {
    if (!graph) {
      await initializeGraph();
    }

    const config = { configurable: { thread_id } };
    const input = { messages: [{ role: 'user', content: text }] };

    const output = await graph.invoke(input, config);
    return output.messages[output.messages.length - 1];
  } catch (error) {
    console.error('Error in runMessage:', error);
    throw error;
  }
}

const router = Router();

// Initialize MongoDB on startup
initializeMongoDB().catch(console.error);

router.post('/chat/start', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid message required' });
    }

    const thread_id = uuidv4();
    const reply = await runMessage(thread_id, message);
    const data = getFormattedMessage(reply.toJSON(), thread_id);
    res.json(data);
  } catch (err: any) {
    console.error('Error in /chat/start:', err);
    res.status(500).json(err);
  }
});

router.post('/chat/continue', async (req, res) => {
  try {
    const { thread_id, message } = req.body;
    if (!thread_id || !message || typeof message !== 'string') {
      return res
        .status(400)
        .json({ error: 'thread_id and valid message required' });
    }

    const reply = await runMessage(thread_id, message);
    const data = getFormattedMessage(reply.toJSON(), thread_id);
    res.json(data);
  } catch (err: any) {
    console.error('Error in /chat/continue:', err);
    res.status(500).json(err);
  }
});

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

export default router;
