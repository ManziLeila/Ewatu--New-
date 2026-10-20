import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  EwatuRole,
  JwtAuthGuard,
  ModuleGuard,
  RequiresModule,
  Roles,
  RolesGuard,
} from '@ewatu/common-auth';
import { CreateJobDto } from './dtos/create-job.dto';
import { UpdateJobDto } from './dtos/update-job.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequiresModule('recruitment')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @Roles(
    EwatuRole.TENANT_ADMIN,
    EwatuRole.HR_MANAGER,
    EwatuRole.RECRUITER,
    EwatuRole.CLIENT_ADMIN,
  )
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.findAll(tid, { status, priority, clientId, search });
  }

  @Get(':id')
  @Roles(
    EwatuRole.TENANT_ADMIN,
    EwatuRole.HR_MANAGER,
    EwatuRole.RECRUITER,
    EwatuRole.CLIENT_ADMIN,
  )
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.findOne(tid, id);
  }

  @Get(':id/pipeline')
  @Roles(
    EwatuRole.TENANT_ADMIN,
    EwatuRole.HR_MANAGER,
    EwatuRole.RECRUITER,
    EwatuRole.CLIENT_ADMIN,
  )
  pipeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.pipeline(tid, id);
  }

  @Get(':id/metrics')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.RECRUITER)
  metrics(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.metrics(tid, id);
  }

  @Get(':id/export')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.RECRUITER)
  async export(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res() res: any,
  ) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    const csv = await this.jobs.exportCsv(tid, id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pipeline-${id}.csv"`);
    res.send(csv);
  }

  @Post()
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.RECRUITER)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateJobDto) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.create(tid, body);
  }

  @Patch(':id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.RECRUITER)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateJobDto,
  ) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.update(tid, id, body);
  }

  @Delete(':id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const tid = this.jobs.requireTenant(user.tenant_id);
    return this.jobs.remove(tid, id);
  }
}
