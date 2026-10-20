import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class PayrollConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefault(tenantId: string) {
    let config = await this.prisma.payrollConfiguration.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    if (!config) {
      config = await this.prisma.payrollConfiguration.create({
        data: {
          tenantId,
          clientId: 'default',
          payDay: 28,
          currency: 'RWF',
          payeEnabled: true,
          rssbPensionEmployee: 0.05,
          rssbPensionEmployer: 0.05,
          rssbMedical: 0.075,
          cbhiRate: 0.005,
          maternityLevy: 0.003,
          occupationalHazardRate: 0.02,
        },
      });
    }
    return config;
  }

  async listClients(tenantId: string) {
    const configs = await this.prisma.payrollConfiguration.findMany({
      where: { tenantId },
      select: { clientId: true },
      orderBy: { clientId: 'asc' },
    });
    return configs.map((c) => ({ clientId: c.clientId }));
  }

  async getByClient(tenantId: string, clientId: string) {
    const config = await this.prisma.payrollConfiguration.findFirst({ where: { tenantId, clientId } });
    if (!config) throw new NotFoundException('Payroll configuration not found');
    return config;
  }

  async create(tenantId: string, dto: CreateConfigDto) {
    const exists = await this.prisma.payrollConfiguration.findFirst({
      where: { tenantId, clientId: dto.clientId },
    });
    if (exists) throw new ConflictException('Payroll configuration already exists for client');
    return this.prisma.payrollConfiguration.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        payDay: dto.payDay ?? 28,
        currency: dto.currency ?? 'RWF',
        payeEnabled: dto.payeEnabled ?? true,
        rssbPensionEmployee: dto.rssbPensionEmployee ?? 0.05,
        rssbPensionEmployer: dto.rssbPensionEmployer ?? 0.05,
        rssbMedical: dto.rssbMedical ?? 0.075,
        cbhiRate: dto.cbhiRate ?? 0.005,
        maternityLevy: dto.maternityLevy ?? 0.003,
        occupationalHazardRate: dto.occupationalHazardRate ?? 0.02,
      },
    });
  }

  async update(tenantId: string, clientId: string, dto: UpdateConfigDto) {
    await this.getByClient(tenantId, clientId);
    const { clientId: _ignoreClientId, ...data } = dto;
    return this.prisma.payrollConfiguration.update({
      where: { tenantId_clientId: { tenantId, clientId } },
      data,
    });
  }
}
