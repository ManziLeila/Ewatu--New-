import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PurgeStep = { name: string; url?: string };

@Injectable()
export class TenantPurgeOrchestrator {
  private readonly log = new Logger(TenantPurgeOrchestrator.name);

  constructor(private readonly config: ConfigService) {}

  async purgeAllServices(tenantId: string) {
    const key = this.config.get<string>('INTERNAL_API_KEY');
    if (!key) {
      throw new BadRequestException('INTERNAL_API_KEY is not configured on platform-service');
    }

    const steps: PurgeStep[] = [
      { name: 'notification', url: this.config.get('NOTIFICATION_SERVICE_URL') },
      { name: 'recruitment', url: this.config.get('RECRUITMENT_SERVICE_URL') },
      { name: 'payroll', url: this.config.get('PAYROLL_SERVICE_URL') },
      { name: 'talent-pool', url: this.config.get('TALENT_POOL_SERVICE_URL') },
      { name: 'procurement', url: this.config.get('PROCUREMENT_SERVICE_URL') },
      { name: 'lending', url: this.config.get('LENDING_SERVICE_URL') },
      { name: 'document', url: this.config.get('DOCUMENT_SERVICE_URL') },
      { name: 'identity', url: this.config.get('IDENTITY_SERVICE_URL') },
    ];

    const results: { service: string; ok: boolean; detail?: string }[] = [];

    for (const step of steps) {
      if (!step.url?.trim()) {
        this.log.warn(`Skipping ${step.name} purge — service URL not configured`);
        results.push({ service: step.name, ok: true, detail: 'skipped (URL not set)' });
        continue;
      }
      const base = step.url.replace(/\/$/, '');
      const path =
        step.name === 'document'
          ? `${base}/api/v1/internal/tenants/${encodeURIComponent(tenantId)}`
          : `${base}/api/v1/internal/tenants/${encodeURIComponent(tenantId)}`;
      try {
        const r = await fetch(path, {
          method: 'DELETE',
          headers: { 'x-internal-key': key },
        });
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`${r.status}: ${text}`);
        }
        results.push({ service: step.name, ok: true });
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        this.log.error(`${step.name} purge failed: ${detail}`);
        throw new BadRequestException(
          `Permanent delete failed while purging ${step.name}: ${detail}`,
        );
      }
    }

    return { tenantId, services: results };
  }
}
