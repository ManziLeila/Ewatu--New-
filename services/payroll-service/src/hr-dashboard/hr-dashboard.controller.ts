import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, EwatuRole, JwtAuthGuard, Roles, RolesGuard } from '@ewatu/common-auth';
import { HrDashboardService } from './hr-dashboard.service';

@Controller('hr-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  EwatuRole.TENANT_ADMIN,
  EwatuRole.HR_MANAGER,
  EwatuRole.MANAGING_DIRECTOR,
  EwatuRole.FINANCE_OFFICER,
  EwatuRole.PAYROLL_SPECIALIST,
  EwatuRole.CFO,
)
export class HrDashboardController {
  constructor(private readonly service: HrDashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.service.getSummary(user.tenant_id as string);
  }
}
