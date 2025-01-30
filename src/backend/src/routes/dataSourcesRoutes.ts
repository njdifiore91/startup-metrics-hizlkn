import { Router } from 'express';
import { dataSourcesController } from '../controllers/dataSourcesController';

const router = Router();

// GET /api/data-sources
router.get('/', dataSourcesController.getActiveSources);

export default router; 