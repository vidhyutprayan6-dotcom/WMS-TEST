import { Router } from 'express';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';

const router = Router();
const configController = new ConfigController(new ConfigService());

router.get('/seed-info', configController.getSeedInfo);

export default router;
