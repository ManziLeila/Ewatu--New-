import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  EwatuRole,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  PermissionsGuard,
  RequirePermissions,
} from '@ewatu/common-auth';
import { ApprovePeriodDto } from './dto/approve-period.dto';
import { CreatePeriodDto } from './dto/create-period.dto';
import { PeriodsService } from './periods.service';

@Controller('payroll/runs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PeriodsController {
  constructor(private readonly service: PeriodsService) {}

  @Get()
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.FINANCE_OFFICER, EwatuRole.CLIENT_ADMIN)
  @RequirePermissions('payroll:read')
  findAll(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    return this.service.findAll(user.tenant_id as string, query);
  }

  @Post()
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.FINANCE_OFFICER)
  @RequirePermissions('payroll:run')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePeriodDto) {
    return this.service.create(user.tenant_id as string, user.sub, dto);
  }

  @Get(':id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.FINANCE_OFFICER, EwatuRole.CLIENT_ADMIN)
  @RequirePermissions('payroll:read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user.tenant_id as string, id);
  }

  @Post(':id/run')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.FINANCE_OFFICER)
  @RequirePermissions('payroll:run')
  run(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.runPayroll(user.tenant_id as string, id, user.sub);
  }

  @Post(':id/submit')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.FINANCE_OFFICER)
  @RequirePermissions('payroll:run')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.submit(user.tenant_id as string, id, user.sub);
  }

  @Post(':id/approve')
  @Roles(
    EwatuRole.TENANT_ADMIN,
    EwatuRole.HR_MANAGER,
    EwatuRole.MANAGING_DIRECTOR,
    EwatuRole.CLIENT_ADMIN,
  )
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApprovePeriodDto,
  ) {
    return this.service.approve(user.tenant_id as string, id, user.sub, user.roles, dto);
  }

  @Post(':id/reject')
  @Roles(
    EwatuRole.TENANT_ADMIN,
    EwatuRole.HR_MANAGER,
    EwatuRole.MANAGING_DIRECTOR,
    EwatuRole.CLIENT_ADMIN,
  )
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApprovePeriodDto,
  ) {
    return this.service.reject(user.tenant_id as string, id, user.sub, user.roles, dto);
  }

  @Post(':id/finalize')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.FINANCE_OFFICER)
  finalize(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.finalize(user.tenant_id as string, id, user.sub);
  }
}
