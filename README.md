# AI Agent Monorepo

A comprehensive AI agent application built with a modern monorepo architecture, featuring a React frontend, Node.js backend, and shared utilities.

## 🏗️ Project Structure

```
ai-agent/
├── packages/
│   ├── shared/          # Shared utilities and types
│   ├── frontend/        # React frontend application
│   └── backend/         # Node.js backend API
├── package.json         # Root package.json with workspace config
└── README.md
```

## 📦 Packages

### Root Workspace (`ai-agent`)

- **Type**: Monorepo root
- **Purpose**: Manages the entire project and workspace dependencies
- **Private**: Yes

### Shared Package (`@monorepo/shared`)

- **Type**: Shared utilities library
- **Purpose**: Contains common types, utilities, and shared code
- **Build**: TypeScript compilation

### Backend Package (`@monorepo/backend`)

- **Type**: Node.js API server
- **Private**: Yes
- **Tech Stack**: Express, LangChain, OpenAI, MongoDB
- **Features**: AI agent capabilities, file processing (PDF, Word), web scraping

### Frontend Package (`@monorepo/frontend`)

- **Type**: React application
- **Private**: Yes
- **Tech Stack**: React Router, Tailwind CSS, Radix UI, CodeMirror
- **Features**: Modern UI with code editing, chat interface, file management

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 22 or higher)
- **npm** (version 11 or higher for workspace support)
- **MongoDB** (for checkpoint storage)

### Installation

1. **Clone and install dependencies:**

   ```bash
   git clone <https://github.com/slavononis/ai-agent>
   cd ai-agent
   npm install
   ```

2. **Set up environment variables:**

   Create a `.env` file in the root directory with:

   ```env
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=
   DEEPSEEK_API_KEY=
   MONGODB_ATLAS_URI=
   TAVILY_API_KEY=

   # Server Configuration
   PORT=4000
   NODE_ENV=development
   ```

3. **Start MongoDB:**

   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest

   # Or using your local MongoDB installation
   mongod
   ```

### Development

**Start both frontend and backend in development mode:**

```bash
npm run dev
```

This will start:

- Frontend development server (on port 3000)
- Backend development server (on port 4000)

**Individual development servers:**

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Production Build

**Build all packages:**

```bash
npm run build
```

**Start production server:**

```bash
npm start
```

## 🛠️ Available Scripts

### Root Level Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:backend` - Start backend development server
- `npm run dev:frontend` - Start frontend development server
- `npm run build` - Build all packages for production
- `npm run start` - Start production server
- `npm run format` - Format code with Prettier

### Backend Scripts

- `npm run dev` - Start backend with nodemon and TypeScript
- `npm run start` - Start backend in production mode
- `npm run build` - Build backend with Vite

### Frontend Scripts

- `npm run dev` - Start React Router development server
- `npm run build` - Build frontend for production
- `npm run start` - Serve production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Shared Scripts

- `npm run build` - Compile TypeScript to JavaScript

## 🔧 Technology Stack

### Backend

- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **AI Framework**: LangChain, LangGraph
- **LLM Integration**: OpenAI, Anthropic
- **Database**: MongoDB (for checkpoints)
- **File Processing**: PDF, Word documents, web scraping
- **Development**: Vite, tsx, nodemon

### Frontend

- **Framework**: React 19 with React Router 7
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with Radix UI components
- **Code Editor**: CodeMirror with multiple language support
- **State Management**: Zustand, React Query
- **Development**: Vite, ESLint, Prettier

### Shared

- **Build Tool**: TypeScript compiler

## 📁 Key Features

### AI Capabilities

- 🤖 Multi-modal AI agent with LangChain
- 🔍 Web search integration (Tavily)
- 📄 Document processing (PDF, Word, text)
- 🌐 Web scraping capabilities
- 💬 Conversational memory with MongoDB checkpoints

### Frontend Features

- 🎨 Modern UI with dark/light themes
- 📝 Code editor with syntax highlighting
- 🗂️ File management interface
- 🔊 Voice input support
- 📊 Real-time chat interface
- 🔄 Resizable panels

### Development Features

- 🏗️ Monorepo architecture with npm workspaces
- 🔧 Hot reload for both frontend and backend
- 📏 ESLint and Prettier for code quality
- 🎯 TypeScript for type safety
- 📦 Optimized production builds

## 🔐 Environment Variables

Required environment variables for the backend:

| Variable            | Description                          | Required |
| ------------------- | ------------------------------------ | -------- |
| `OPENAI_API_KEY`    | API key for AI models                | Yes      |
| `ANTHROPIC_API_KEY` | API key for AI models                | Yes      |
| `DEEPSEEK_API_KEY`  | API key for AI models                | Yes      |
| `TAVILY_API_KEY`    | Tavily API key for web search        | Yes      |
| `MONGODB_ATLAS_URI` | MongoDB connection string            | Yes      |
| `PORT`              | Server port (default: 4000)          | No       |
| `NODE_ENV`          | Environment (development/production) | No       |

## 🐛 Troubleshooting

### Common Issues

1. **Workspace dependencies not found:**

   ```bash
   npm install
   ```

2. **MongoDB connection errors:**
   - Ensure MongoDB is running
   - Check `MONGODB_ATLAS_URI` in environment variables

3. **API key errors:**
   - Verify all required API keys are set in `.env` file
   - Check that API keys have proper permissions

4. **Build errors:**
   ```bash
   npm run build
   # Check individual package builds if needed
   npm run build --workspace @monorepo/frontend
   npm run build --workspace @monorepo/backend
   ```

## 🤝 Contributing

1. Ensure code is formatted:

   ```bash
   npm run format
   ```

2. Run linting:

   ```bash
   npm run lint
   ```

3. Build all packages to verify:
   ```bash
   npm run build
   ```

---

For more detailed information about individual packages, refer to their respective `package.json` files and documentation.
