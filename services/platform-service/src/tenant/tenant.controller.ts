import {

  Body,

  Controller,

  Delete,

  Get,

  Param,

  Patch,

  Post,

  HttpCode,

  UseGuards,

} from '@nestjs/common';

import {

  EwatuRole,

  JwtAuthGuard,

  Roles,

  RolesGuard,

} from '@ewatu/common-auth';

import { CreateTenantDto } from './dtos/create-tenant.dto';

import { RejectTenantDto } from './dtos/reject-tenant.dto';

import { UpdateTenantDto } from './dtos/update-tenant.dto';

import { PurgeTenantDto } from './dtos/purge-tenant.dto';

import { TenantService } from './tenant.service';



@Controller('tenants')

export class TenantController {

  constructor(private readonly tenant: TenantService) {}



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Get()

  list() {

    return this.tenant.findAll();

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Get('pending')

  listPending() {

    return this.tenant.findPending();

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Post()

  create(@Body() body: CreateTenantDto) {

    return this.tenant.create(body);

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Patch(':id/approve')

  approve(@Param('id') id: string) {

    return this.tenant.approve(id);

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Patch(':id/reject')

  reject(@Param('id') id: string, @Body() body: RejectTenantDto) {

    return this.tenant.reject(id, body.reason);

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Patch(':id/suspend')

  suspend(@Param('id') id: string) {

    return this.tenant.suspend(id);

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Patch(':id/reactivate')

  reactivate(@Param('id') id: string) {

    return this.tenant.reactivate(id);

  }



  // Soft delete — archives the tenant rather than removing the row. See TenantService.archive.

  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Delete(':id')

  archive(@Param('id') id: string) {

    return this.tenant.archive(id);

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Patch(':id')

  update(@Param('id') id: string, @Body() body: UpdateTenantDto) {

    return this.tenant.updateAdmin(id, body);

  }



  @UseGuards(JwtAuthGuard, RolesGuard)

  @Roles(EwatuRole.PLATFORM_SUPER_ADMIN)

  @Post(':id/purge')

  @HttpCode(200)

  purgePermanent(@Param('id') id: string, @Body() body: PurgeTenantDto) {

    return this.tenant.purgePermanent(id, body.confirmSlug);

  }

}

