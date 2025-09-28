import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import api from './routes/api';
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api', api);

app.get('/', (_req, res) =>
  res.send({ message: 'Monorepo backend is running (TS)' })
);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
