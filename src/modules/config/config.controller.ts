import { Request, Response, NextFunction } from 'express';
import { ConfigService } from './config.service';

export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  getSeedInfo = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.configService.getSeedInfo();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
