import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonAuthModule, RequestLoggerMiddleware } from '@ewatu/common-auth';
import { ScheduleModule } from '@nestjs/schedule';
import { ContractsModule } from './contracts/contracts.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { PayslipModule } from './payslip/payslip.module';
import { PayrollConfigModule } from './payroll-config/payroll-config.module';
import { PeriodsModule } from './periods/periods.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { OutsourcingModule } from './outsourcing/outsourcing.module';
import { LeaveModule } from './leave/leave.module';
import { PerformanceModule } from './performance/performance.module';
import { PermitsModule } from './permits/permits.module';
import { TeamsModule } from './teams/teams.module';
import { TasksModule } from './tasks/tasks.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { HrDashboardModule } from './hr-dashboard/hr-dashboard.module';
import { GrievancesModule } from './grievances/grievances.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TrainingModule } from './training/training.module';
import { DocumentsModule } from './documents/documents.module';
import { PayrollCommonModule } from './common/payroll-common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CommonAuthModule,
    PayrollCommonModule,
    PrismaModule,
    HealthModule,
    PayrollConfigModule,
    EmployeesModule,
    ContractsModule,
    PeriodsModule,
    ReportsModule,
    PayslipModule,
    JobsModule,
    OutsourcingModule,
    LeaveModule,
    PerformanceModule,
    PermitsModule,
    TeamsModule,
    TasksModule,
    AnnouncementsModule,
    HrDashboardModule,
    GrievancesModule,
    AttendanceModule,
    TrainingModule,
    DocumentsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
