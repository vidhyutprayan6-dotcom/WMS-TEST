import { Prisma } from '@prisma/client';
import { AuditRepository, CreateAuditLogInput } from '../repositories/audit.repository';
import { AuditLog } from '@prisma/client';
import { useDemoStore } from '../../../database/connection';
import { demoStore } from '../../../demo/demo-store';

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(input: CreateAuditLogInput, tx?: Prisma.TransactionClient): Promise<AuditLog> {
    return this.auditRepository.create(input, tx);
  }

  async getLogsForClient(clientId: string) {
    if (await useDemoStore()) {
      return demoStore.getAuditLogs(clientId);
    }
    return this.auditRepository.findByClient(clientId);
  }
}
