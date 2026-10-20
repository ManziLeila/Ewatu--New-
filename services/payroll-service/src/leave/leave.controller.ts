import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
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
import { LeaveService } from './leave.service';

@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequiresModule('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('leave-types')
  getLeaveTypes(@CurrentUser() user: AuthUser) {
    return this.leaveService.getLeaveTypes(user.tenant_id as string);
  }

  @Get('leave-balances')
  getLeaveBalances(
    @CurrentUser() user: AuthUser,
    @Query('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.leaveService.getLeaveBalances(
      user.tenant_id as string,
      employeeId,
      targetYear,
      { email: user.email, roles: user.roles, permissions: user.permissions },
    );
  }

  // Static segment before the generic list route to avoid ambiguity.
  @Get('leave-requests/team-out')
  getTeamOut(
    @CurrentUser() user: AuthUser,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.leaveService.getTeamOut(user.tenant_id as string, user.email, start, end);
  }

  @Get('leave-requests')
  getLeaveRequests(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
    @Query('department') department?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('managerId') managerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.leaveService.getLeaveRequests(
      user.tenant_id as string,
      { status, employeeId, department, leaveTypeId, managerId, startDate, endDate, search },
      { email: user.email, roles: user.roles, permissions: user.permissions },
    );
  }

  @Get('leave-requests/:id')
  getLeaveRequest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.getLeaveRequestById(user.tenant_id as string, id, {
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    });
  }

  @Patch('leave-requests/:id')
  updateLeaveRequest(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days?: number;
      reason?: string;
      delegateToEmployeeId?: string;
      emergencyContactPhone?: string;
    },
  ) {
    return this.leaveService.updateLeaveRequest(user.tenant_id as string, id, body, {
      userId: user.sub,
      email: user.email,
      roles: user.roles,
      ip: req.ip,
    });
  }

  @Post('leave-requests/:id/cancel')
  cancelLeaveRequest(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.leaveService.cancelLeaveRequest(user.tenant_id as string, id, body.reason, {
      userId: user.sub,
      email: user.email,
      roles: user.roles,
      ip: req.ip,
    });
  }

  @Post('leave-requests')
  createLeaveRequest(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body()
    body: {
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      days?: number;
      reason?: string;
      attachmentS3Key?: string;
      delegateToEmployeeId?: string;
      emergencyContactPhone?: string;
    },
  ) {
    return this.leaveService.createLeaveRequest(user.tenant_id as string, body, {
      userId: user.sub,
      email: user.email,
      roles: user.roles,
      ip: req.ip,
    });
  }

  // --- Holidays ---

  @Get('holidays')
  listHolidays(@CurrentUser() user: AuthUser) {
    return this.leaveService.listHolidays(user.tenant_id as string);
  }

  @Post('holidays')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  createHoliday(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; month: number; day: number; note?: string },
  ) {
    return this.leaveService.createHoliday(user.tenant_id as string, body);
  }

  @Patch('holidays/:id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  updateHoliday(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; month: number; day: number; note: string }>,
  ) {
    return this.leaveService.updateHoliday(user.tenant_id as string, id, body);
  }

  @Delete('holidays/:id')
  @Roles(EwatuRole.TENANT_ADMIN, EwatuRole.HR_MANAGER, EwatuRole.MANAGING_DIRECTOR)
  deleteHoliday(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.leaveService.deleteHoliday(user.tenant_id as string, id);
  }

  @Post('leave-requests/:id/attachment')
  uploadAttachment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { contentType: string; fileSize: number },
  ) {
    return this.leaveService.uploadLeaveAttachment(
      user.tenant_id as string,
      id,
      body.contentType,
      body.fileSize,
    );
  }

  @Post('leave-requests/:id/approve')
  approveLeaveRequest(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.leaveService.approveLeaveRequest(
      user.tenant_id as string,
      id,
      { userId: user.sub, roles: user.roles, email: user.email, permissions: user.permissions, ip: req.ip },
      body.note,
    );
  }

  @Post('leave-requests/:id/reject')
  rejectLeaveRequest(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.leaveService.rejectLeaveRequest(
      user.tenant_id as string,
      id,
      { userId: user.sub, roles: user.roles, email: user.email, permissions: user.permissions, ip: req.ip },
      body.note,
    );
  }

  @Post('leave-requests/:id/request-info')
  requestMoreInfo(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { note: string },
  ) {
    return this.leaveService.requestMoreInfo(
      user.tenant_id as string,
      id,
      { userId: user.sub, roles: user.roles, email: user.email, permissions: user.permissions, ip: req.ip },
      body.note,
    );
  }
}
