import { Router } from 'express';

const router = Router();

router.get('/hello', (_req, res) => {
  res.json({ msg: 'Hello from backend (TS)!', time: new Date().toISOString() });
});

router.post('/echo', (req, res) => {
  res.json({ received: req.body });
});

export default router;