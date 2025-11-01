import ViteExpress from 'vite-express';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import project from './routes/project';
import transcript from './routes/transcript';
import conversation from './routes/conversation';
import auth from './routes/auth';
import dbConnect from './lib/mongoDB';
import { initMcps } from './lib/mcp-servers';
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.use(cors());
app.use(express.json());
app.use('/api/auth', auth);
app.use('/api/project', project);
app.use('/api/conversation', conversation);
app.use('/api/transcript', transcript);

async function startServer() {
  try {
    const client = await dbConnect();
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );

    await initMcps();

    ViteExpress.listen(app, PORT, () =>
      console.log(`Server is listening on port ${PORT}...`)
    );
  } catch (error) {
    console.error('Error connecting to:', error);
    process.exit(1);
  }
}

startServer();
