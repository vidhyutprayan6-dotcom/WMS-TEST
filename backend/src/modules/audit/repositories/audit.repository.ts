import { Prisma, AuditLog } from '@prisma/client';
import prisma from '../../../database/prisma';

export interface CreateAuditLogInput {
  clientId?: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

export class AuditRepository {
  async create(data: CreateAuditLogInput, tx?: Prisma.TransactionClient): Promise<AuditLog> {
    const db = tx ?? prisma;
    return db.auditLog.create({ data });
  }

  async findByClient(clientId: string): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
