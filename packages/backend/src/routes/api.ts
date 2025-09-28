import { Router } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from '@langchain/langgraph';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { BaseMessage, trimMessages } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';
import { MessageModelDTO, MessageResponseDTO } from '@monorepo/shared';
const getFormattedMessage = (
  msg: any,
  thread_id: string
): MessageResponseDTO => {
  return {
    id: msg.kwargs.id,
    thread_id,
    content: msg.kwargs.content,
    role: msg.id[2],
  };
};
const llm = new ChatOpenAI({
  model: 'gpt-5-nano-2025-08-07',
  // temperature: 0.3,
});

const promptTemplate = ChatPromptTemplate.fromMessages([
  {
    role: 'system',
    content: `
You are an **application code generator**.

## Core Requirements
- The application must be **fully functional, runnable, and production-ready**.
- Always return the **full response** as a single JSON object with this structure:
{{
  "name": "<project-name>",
  "version": "<project-version>",
  "type": "<project-type>",
  "description": "<project-description in markdown format (summary + explanation of the project)>",
  "files": [
    {{
      "path": "<relative/file/path>",
      "content": "<full file content with REAL newlines (\\n), NOT escaped (\\\\n)>"
    }},
    ...
  ]
}}

## Formatting Rules
- In every "content" field:
  - Use **literal newlines** for line breaks. ✅ Example:
    \`\`\`json
    "content": "line 1\\nline 2"
    \`\`\`
    ❌ Do NOT produce: "line 1\\\\nline 2"
  - Do NOT double-escape slashes or quotes.  
    ✅ Correct: \`<div id="root"></div>\`  
    ❌ Wrong: \`<div id=\\\\\\"root\\\\\\"></div>\`
  - Always produce JSON-safe strings, but **minimize escaping** to the minimum required for valid JSON.
- The JSON must be **valid, parseable**, and stand on its own.
- Do not include explanations or comments outside the JSON.

## Principles to Follow
- **SOLID OOP principles** (when applicable).
- **DRY**: Avoid duplication by extracting reusable logic into helpers/utilities.
- **KISS**: Keep code simple, readable, and maintainable.
- Use **modern, idiomatic approaches** for the chosen language/framework.

## File Structure
- Organize files/folders in a **clean, conventional, and scalable way**.
- Always include a \`README.md\` with setup & run instructions.
- Follow conventions of **modern production projects**.

## Output Guarantee
- Ensure **all files are complete** and contain full working code (no placeholders like "...").
- Include required config or scripts.
- Do not add extra tooling (Docker, etc.) unless explicitly requested.
    `,
  },
  new MessagesPlaceholder('messages'),
]);

const trimmer = trimMessages({
  maxTokens: 1000,
  strategy: 'last',
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: 'human',
});

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const trimmed = await trimmer.invoke(state.messages);
  const prompt = await promptTemplate.invoke({ messages: trimmed });
  const response = await llm.invoke(prompt);
  return { messages: [response] };
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode('model', callModel)
  .addEdge(START, 'model')
  .addEdge('model', END);

const memorySaver = new MemorySaver();
const graph = workflow.compile({ checkpointer: memorySaver });

async function runMessage(thread_id: string, text: string) {
  const config = { configurable: { thread_id } };
  const input = { messages: [{ role: 'user', content: text }] };
  const output = await graph.invoke(input, config);
  return output.messages[output.messages.length - 1];
}

const router = Router();

router.post('/chat/start', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const thread_id = uuidv4();
    const reply = await runMessage(thread_id, message);
    const data = getFormattedMessage(reply.toJSON(), thread_id);
    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: JSON.stringify(err) });
  }
});

router.post('/chat/continue', async (req, res) => {
  try {
    const { thread_id, message } = req.body;
    if (!thread_id || !message) {
      return res.status(400).json({ error: 'thread_id and message required' });
    }

    const reply = await runMessage(thread_id, message);
    const data = getFormattedMessage(reply.toJSON(), thread_id);
    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/chat/:thread_id', async (req, res) => {
  try {
    const { thread_id } = req.params;
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
      messages,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
