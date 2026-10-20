import { Injectable, NotFoundException } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private decryptBankAccount(stored: string | null | undefined): string {
    if (!stored) return '';

    try {
      if (stored.includes(':')) {
        const [ivHex, cipherHex] = stored.split(':');
        if (ivHex && cipherHex) {
          const keyHex = process.env.ENCRYPTION_KEY;
          if (keyHex && keyHex.length === 64) {
            const key = Buffer.from(keyHex, 'hex');
            const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
            const decrypted = Buffer.concat([
              decipher.update(Buffer.from(cipherHex, 'hex')),
              decipher.final(),
            ]).toString('utf8');
            if (decrypted) return decrypted;
          }
        }
      }

      const fromBase64 = Buffer.from(stored, 'base64').toString('utf8');
      if (fromBase64 && /^[\x20-\x7E]+$/.test(fromBase64)) {
        return fromBase64;
      }
    } catch {
      // Fall through — return empty for unreadable records
    }

    return '';
  }

  async generatePAYEReport(tenantId: string, periodId: string) {
    const records = await this.prisma.payrollRecord.findMany({
      where: { tenantId, periodId },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });
    if (!records.length) throw new NotFoundException('No payroll records found');
    const rows = records.map(
      (r) => `${r.employee.firstName} ${r.employee.lastName},${Number(r.grossPay)},${Number(r.paye)}`,
    );
    return `Employee Name,Gross Pay,PAYE\n${rows.join('\n')}\n`;
  }

  async generateRSSBReport(tenantId: string, periodId: string) {
    const records = await this.prisma.payrollRecord.findMany({
      where: { tenantId, periodId },
      include: { employee: { select: { firstName: true, lastName: true, rssbNumber: true } } },
    });
    if (!records.length) throw new NotFoundException('No payroll records found');
    const rows = records.map(
      (r) =>
        `${r.employee.firstName} ${r.employee.lastName},${r.employee.rssbNumber ?? ''},${Number(r.rssbEmployee)},${Number(r.rssbEmployer)},${Number(r.rssbMedical)}`,
    );
    return `Employee Name,RSSB Number,RSSB Employee,RSSB Employer,RSSB Medical\n${rows.join('\n')}\n`;
  }

  async generateSummaryReport(tenantId: string, clientId: string, year: number) {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { tenantId, clientId, periodYear: year },
      include: { records: true },
      orderBy: { periodMonth: 'asc' },
    });
    return periods.map((period) => {
      const totals = period.records.reduce(
        (acc, rec) => ({
          totalGross: acc.totalGross + Number(rec.grossPay),
          totalNet: acc.totalNet + Number(rec.netPay),
          totalPAYE: acc.totalPAYE + Number(rec.paye),
          totalRSSB: acc.totalRSSB + Number(rec.rssbEmployee) + Number(rec.rssbEmployer) + Number(rec.rssbMedical),
        }),
        { totalGross: 0, totalNet: 0, totalPAYE: 0, totalRSSB: 0 },
      );
      return {
        month: period.periodMonth,
        year: period.periodYear,
        ...totals,
        employeeCount: period.records.length,
      };
    });
  }

  async generateBankFile(tenantId: string, periodId: string) {
    const records = await this.prisma.payrollRecord.findMany({
      where: { tenantId, periodId },
      include: {
        employee: { select: { firstName: true, lastName: true, bankName: true, bankBranch: true, bankAccountEncrypted: true } },
      },
    });
    if (!records.length) throw new NotFoundException('No payroll records found');
    const rows = records.map((r) => {
      const account = this.decryptBankAccount(r.employee.bankAccountEncrypted);
      return `${r.employee.firstName} ${r.employee.lastName},${r.employee.bankName ?? ''},${r.employee.bankBranch ?? ''},${account},${Number(r.netPay)}`;
    });
    return `Employee Name,Bank,Branch,Account,Net Pay\n${rows.join('\n')}\n`;
  }
}
