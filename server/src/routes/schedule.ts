import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/:user/:day', (req, res) => {
  res.json({ data: [] });
});

export default router;