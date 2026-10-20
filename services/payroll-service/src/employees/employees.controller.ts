import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsArray } from 'class-validator';
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
import { EmployeesService, BulkImportRow } from './employees.service';
import { CreateEmployeeDto } from './dtos/create-employee.dto';
import { CreateEmployeeFromPlacementDto } from './dtos/create-employee-from-placement.dto';
import { UpdateEmployeeDto } from './dtos/update-employee.dto';

export class BulkImportEmployeesDto {
  @IsArray()
  rows: BulkImportRow[];
}

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequiresModule('hr-employee')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.FINANCE_OFFICER)
  list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    return this.employees.findAll(user.tenant_id as string, query, user.permissions);
  }

  // Static segments before `:id` routes to avoid path conflicts.
  @Post('import/csv')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  bulkImport(@CurrentUser() user: AuthUser, @Body() body: BulkImportEmployeesDto) {
    return this.employees.bulkImport(user.tenant_id as string, body.rows);
  }

  /** No @Roles guard — any authenticated tenant user may look up their own linked employee record. */
  @Get('me')
  getMyRecord(@CurrentUser() user: AuthUser) {
    return this.employees.findMyRecord(user.tenant_id as string, user.email as string);
  }

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: AuthUser) {
    return this.employees.getMyProfile(user.tenant_id as string, user.email as string);
  }

  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      phone?: string;
      bankAccount?: string;
      bankName?: string;
      bankBranch?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
    },
  ) {
    return this.employees.updateMyProfile(user.tenant_id as string, user.email as string, body);
  }

  @Get('me/documents')
  listMyDocuments(@CurrentUser() user: AuthUser) {
    return this.employees.listMyDocuments(user.tenant_id as string, user.email as string);
  }

  @Post('me/documents')
  requestMyDocumentUpload(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; contentType: string; fileSize: number; expiryDate?: string },
  ) {
    return this.employees.requestMyDocumentUpload(user.tenant_id as string, user.email as string, body);
  }

  @Delete('me/documents/:documentId')
  deleteMyDocument(@CurrentUser() user: AuthUser, @Param('documentId') documentId: string) {
    return this.employees.deleteMyDocument(user.tenant_id as string, user.email as string, documentId);
  }

  /** No @Roles guard — staff-safe fields only (see EmployeesService.getDirectory). */
  @Get('directory')
  directory(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.employees.getDirectory(user.tenant_id as string, search);
  }

  @Get(':id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.FINANCE_OFFICER)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employees.findOne(user.tenant_id as string, id, user.permissions);
  }

  @Post()
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateEmployeeDto) {
    return this.employees.create(user.tenant_id as string, body);
  }

  @Post('from-placement')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  createFromPlacement(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateEmployeeFromPlacementDto,
  ) {
    return this.employees.createFromPlacement(user, body);
  }

  @Patch(':id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateEmployeeDto) {
    return this.employees.update(user.tenant_id as string, id, body);
  }

  @Delete(':id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  terminate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.employees.terminate(user.tenant_id as string, id);
  }

  @Post(':id/convert')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  convert(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      placementId?: string;
      candidateData?: { firstName?: string; lastName?: string; email?: string; phone?: string };
    },
  ) {
    return this.employees.convertFromPlacement(user.tenant_id as string, id, body);
  }
}
