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

    const dbName = 'langgraph-checkpoint-mongodb';
    checkpointer = new MongoDBSaver({ client, dbName });

    return { client, checkpointer };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

const llm = new ChatOpenAI({
  model: 'gpt-4o',
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  {
    role: 'system',
    content: `You are an **application code generator**.
## Core Requirements
- The application must be **fully functional, runnable, and production-ready**.
- Always return the **full response** as a single JSON object with this structure:
{{
  "name": "<project-name>",
  "version": "<project-version default to 1.0.0 and increment for modifications based on semantic versioning and increment for modifications>",
  "type": "<project-type>",
  "description": "<project-description in markdown format>",
  "files": [
    {{
      "path": "<relative/file/path>",
      "content": "<full file content>"
    }}
  ]
}}

## JSON Formatting Rules
- Do not wrap in \`\`\`json
- Use proper JSON syntax with double quotes for strings
- For line breaks in file content, use actual newline characters (not \\n)
- Escape only what's necessary for valid JSON: double quotes ("), backslashes (\\), and control characters
- Keep content as clean and readable as possible

## Principles to Follow
- **SOLID OOP principles** (when applicable)
- **DRY**: Avoid duplication by extracting reusable logic
- **KISS**: Keep code simple, readable, and maintainable
- Use **modern, idiomatic approaches** for the chosen language/framework

## File Structure
- Organize files/folders in a **clean, conventional, and scalable way**
- Always include a README.md with setup & run instructions
- Follow conventions of **modern production projects**

## CONTEXT AWARENESS
- Analyze the conversation history to understand if this is a NEW PROJECT or MODIFICATION
- For modifications, carefully review previous file structures and **INCLUDE ALL EXISTING FILES**
- NEVER remove files unless explicitly requested to do so
- **When modifying an existing project, the response MUST contain ALL files from the current project state, plus any new files, plus any modifications**
- The complete project should be functional after every response

## DESCRIPTION STRATEGY

### FOR NEW PROJECTS (first message):
Provide a comprehensive description including:
- Full project overview and architecture
- Technology choices and rationale
- Setup and run instructions
- Key features and structure

### FOR MODIFICATIONS (subsequent messages):
Provide a focused change description including:
- **Files Added**: List new files created
- **Files Modified**: List existing files changed  
- **Files Removed**: List files deleted (ONLY if explicitly requested)
- **Change Rationale**: Explain why changes were made
- **Impact Analysis**: How changes affect existing functionality

## CHANGE MANAGEMENT RULES
1. **CRITICAL: Complete File Preservation**: ALWAYS include ALL files from the previous project state, even if unchanged. The response must contain the complete, working project.
2. **Minimal Changes**: Only modify what's necessary to fulfill the current request
3. **Consistency**: Maintain existing patterns, styles, and architecture
4. **Completeness**: Ensure the project remains fully functional after changes
5. **Never Omit Files**: Do not omit any existing files unless explicitly requested to remove them

## Output Guarantee
- Ensure **all files are complete** and contain full working code (no placeholders)
- Include required config or scripts
- Do not add extra tooling unless explicitly requested
- **CRITICAL: Include ALL files from the current project state** - the response must contain the complete project, not just modified files`,
  },
  new MessagesPlaceholder('messages'),
]);

const trimmer = trimMessages({
  maxTokens: 20000,
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

    // Get the state using the checkpointer directly
    const state = await checkpointer.getTuple(config);

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
      state,
    });
  } catch (err: any) {
    console.error('Error in /chat/:thread_id:', err);
    res.status(500).json(err);
  }
});

export default router;
