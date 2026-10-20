import { apiBase, authFetch, parseJson } from './lib/http';

function payrollUrl(): string {
  const gateway = apiBase();
  if (gateway) return gateway.replace(/\/$/, '');
  const base = import.meta.env.VITE_PAYROLL_API ?? 'http://localhost:3016';
  return base.replace(/\/$/, '');
}

export type Employee = {
  id: string;
  tenantId: string;
  employeeCode: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  baseSalary: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  startDate: string | null;
  placementId: string | null;
  candidateId: string | null;
  department?: string | null;
  location?: string | null;
  probationEndDate?: string | null;
  managerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollConfig = {
  id: string;
  tenantId: string;
  frequency: 'WEEKLY' | 'BI_MONTHLY' | 'MONTHLY';
  payDateDayOfMonth: number;
  currency: string;
  payComponents: unknown[];
  statutoryRules: Record<string, unknown>;
  customDeductions: unknown[];
};

export type PayrollLine = {
  id: string;
  employeeId: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  employee?: Employee;
};

export type PayrollRunApproval = {
  id: string;
  approverRole: 'HR_MANAGER' | 'MD' | 'CLIENT_ADMIN';
  action: 'APPROVED' | 'REJECTED';
  approverId: string;
  comments: string | null;
  createdAt: string;
};

export type PayrollRunStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'HR_APPROVED'
  | 'MD_APPROVED'
  | 'CLIENT_APPROVED'
  | 'FINALIZED';

export type PayrollRun = {
  id: string;
  tenantId: string;
  clientId: string;
  periodYear: number;
  periodMonth: number;
  status: PayrollRunStatus;
  currency: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  recordCount?: number;
  totalNetPay?: number;
  totalGrossPay?: number;
  records?: PayrollLine[];
  approvals?: PayrollRunApproval[];
};

export type LeaveType = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  defaultDays: string;
  createdAt: string;
  updatedAt: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  numberOfDays: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  attachmentS3Key: string | null;
  attachmentUrl?: string | null;
  delegateToEmployeeId: string | null;
  emergencyContactPhone: string | null;
  createdAt: string;
  employee?: Employee;
  leaveType?: LeaveType;
  delegateTo?: { id: string; firstName: string; lastName: string } | null;
};

export type DeploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RECALLED' | 'TRANSFERRED' | 'ON_BENCH';
export type OutsourcingEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'FIXED_TERM';
export type SecondmentContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

export type OutsourcingAssignment = {
  id: string;
  tenantId: string;
  employeeId: string;
  clientName: string;
  clientId: string | null;
  roleName: string;
  deploymentSite: string | null;
  employmentType: OutsourcingEmploymentType;
  deploymentStatus: DeploymentStatus;
  startDate: string;
  endDate: string | null;
  availabilityDate: string | null;
  monthlyFee: string | null;
  currency: string;
  noticePeriodDays: number;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  };
  contracts?: SecondmentContract[];
};

export type SecondmentContract = {
  id: string;
  tenantId: string;
  assignmentId: string;
  contractRef: string | null;
  clientName: string;
  role: string;
  billingRate: string;
  currency: string;
  workingHoursPerWeek: number;
  noticePeriodDays: number;
  governingLaw: string | null;
  startDate: string;
  endDate: string | null;
  renewalDate: string | null;
  status: SecondmentContractStatus;
  terminationReason: string | null;
  terminatedAt: string | null;
  terminatedBy: string | null;
  alert90Sent: boolean;
  alert60Sent: boolean;
  alert30Sent: boolean;
  s3Key: string | null;
  createdAt: string;
  updatedAt: string;
  assignment?: OutsourcingAssignment;
  amendments?: ContractAmendment[];
};

export type ContractAmendment = {
  id: string;
  tenantId: string;
  contractId: string;
  changedBy: string;
  reason: string;
  changesSummary: string;
  snapshotJson: Record<string, unknown>;
  createdAt: string;
};

export type DeploymentHistoryEntry = {
  id: string;
  tenantId: string;
  assignmentId: string;
  clientName: string;
  roleName: string;
  startDate: string;
  endDate: string | null;
  reason: string | null;
  createdAt: string;
};


export type ChecklistItem = {
  id: string;
  label: string;
  required?: boolean;
  done?: boolean;
  doneAt?: string | null;
};

export type EmployeeOnboarding = {
  id: string;
  employeeId: string;
  templateId: string | null;
  items: ChecklistItem[];
  completedAt: string | null;
};

export type EmployeeOffboarding = {
  id: string;
  employeeId: string;
  items: ChecklistItem[];
  finalPayNote: string | null;
  completedAt: string | null;
};

async function payrollFetch(path: string, init?: RequestInit) {
  const r = await authFetch(`${payrollUrl()}${path}`, init);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r;
}

/** Self-service: look up the employee record linked to the caller's own account. No admin role required. */
export async function fetchMyEmployee(): Promise<Employee | null> {
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/me`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return parseJson(r);
}

export type MyProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string;
  department: string | null;
  startDate: string;
  bankAccount?: string;
  bankName: string | null;
  bankBranch: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/me/profile`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return parseJson(r);
}

export async function updateMyProfile(body: {
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  bankBranch?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}): Promise<MyProfile> {
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/me/profile`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return parseJson(r);
}

export type MyDocument = {
  id: string;
  name: string;
  s3Key: string;
  expiryDate: string | null;
  uploadedAt: string;
  downloadUrl: string | null;
};

export async function fetchMyDocuments(): Promise<MyDocument[]> {
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/me/documents`);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return parseJson(r);
}

export async function uploadMyDocument(file: File, expiryDate?: string): Promise<MyDocument> {
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/me/documents`, {
    method: 'POST',
    body: JSON.stringify({
      name: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      expiryDate: expiryDate || undefined,
    }),
  });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  const { uploadUrl, document } = await parseJson<{ uploadUrl: string; document: MyDocument }>(r);
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) throw new Error('Failed to upload document');
  return document;
}

export async function deleteMyDocument(id: string): Promise<void> {
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/me/documents/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
}

export type DirectoryEntry = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string | null;
  email: string;
  phone: string | null;
};

export async function fetchDirectory(search?: string): Promise<DirectoryEntry[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const r = await authFetch(`${payrollUrl()}/api/v1/employees/directory${qs}`);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return parseJson(r);
}

// --- Tasks ---

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export type Task = {
  id: string;
  tenantId: string;
  employeeId: string;
  assignedByName: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string };
};

async function payrollFetchAuth(path: string, init?: RequestInit): Promise<Response> {
  const r = await authFetch(`${payrollUrl()}${path}`, init);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r;
}

export async function fetchMyTasks(): Promise<Task[]> {
  return parseJson(await payrollFetchAuth('/api/v1/tasks/me'));
}

export async function fetchTasksAssignedByMe(): Promise<Task[]> {
  return parseJson(await payrollFetchAuth('/api/v1/tasks/assigned-by-me'));
}

export async function createTask(body: {
  employeeId: string;
  title: string;
  description?: string;
  dueDate?: string;
}): Promise<Task> {
  return parseJson(await payrollFetchAuth('/api/v1/tasks', { method: 'POST', body: JSON.stringify(body) }));
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return parseJson(
    await payrollFetchAuth(`/api/v1/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  );
}

export async function deleteTask(id: string): Promise<void> {
  await payrollFetchAuth(`/api/v1/tasks/${id}`, { method: 'DELETE' });
}

// --- Announcements ---

export type Announcement = {
  id: string;
  tenantId: string;
  teamId: string | null;
  title: string;
  body: string;
  postedByName: string;
  createdAt: string;
  team?: { id: string; name: string } | null;
};

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return parseJson(await payrollFetchAuth('/api/v1/announcements'));
}

export async function createAnnouncement(body: { title: string; body: string; teamId?: string }): Promise<Announcement> {
  return parseJson(await payrollFetchAuth('/api/v1/announcements', { method: 'POST', body: JSON.stringify(body) }));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await payrollFetchAuth(`/api/v1/announcements/${id}`, { method: 'DELETE' });
}

// --- HR Dashboard ---

export type HrDashboardSummary = {
  headcount: {
    total: number;
    byDepartment: { department: string; count: number }[];
    byType: { type: string; count: number }[];
    byLocation: { location: string; count: number }[];
  };
  leave: {
    pendingApprovals: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
  };
  finance?: {
    currency: string;
    ytdGrossPay: number;
    ytdNetPay: number;
    allTimeNetPay: number;
    avgNetPerMonth: number;
    monthsWithData: number;
    finalizedRunsYtd: number;
    latestPeriod: {
      periodYear: number;
      periodMonth: number;
      grossPay: number;
      netPay: number;
    } | null;
    monthlyTrend: { periodYear: number; periodMonth: number; netPay: number }[];
    estimatedMonthlyGross: number;
  };
  payroll: {
    inProgressPeriods: {
      id: string;
      periodMonth: number;
      periodYear: number;
      status: string;
      recordCount: number;
    }[];
    exceptionsCount: number;
    exceptions: { employeeId: string; employeeName: string; issue: string }[];
  };
  lifecycleAlerts: {
    contractsExpiringSoon: { id: string; employeeId: string; employeeName: string; endDate: string }[];
    permitsExpiringSoon: { id: string; employeeId: string; employeeName: string; expiryDate: string; permitType: string }[];
    probationsEndingSoon: { employeeId: string; employeeName: string; probationEndDate: string }[];
    documentsExpiringSoon: { id: string; employeeId: string; employeeName: string; documentName: string; expiryDate: string }[];
  };
  performance: {
    cycleId: string;
    cycleName: string;
    totalEmployees: number;
    completedCount: number;
    completionPct: number;
    overdueCount: number;
  } | null;
  turnover: {
    terminatedLast12Months: number;
    currentActiveHeadcount: number;
    ratePct: number;
  };
  disciplinary: {
    activeCount: number;
    escalatedCount: number;
  };
  attendance: {
    lateCount30d: number;
    absentCount30d: number;
    onTimeRatePct: number | null;
  };
  training: {
    courseId: string;
    courseName: string;
    totalAssigned: number;
    completedCount: number;
    completionPct: number;
    overdueCount: number;
  }[];
  grievances: {
    openCount: number;
    investigatingCount: number;
  };
};

export async function fetchHrDashboardSummary(): Promise<HrDashboardSummary> {
  return parseJson(await payrollFetchAuth('/api/v1/hr-dashboard/summary'));
}

// --- Grievances ---

export type GrievanceCategory =
  | 'HARASSMENT'
  | 'DISCRIMINATION'
  | 'WORKPLACE_CONDITIONS'
  | 'PAY_DISPUTE'
  | 'POLICY_VIOLATION'
  | 'OTHER';

export type GrievanceStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

export type GrievanceCase = {
  id: string;
  tenantId: string;
  raisedByEmployeeId: string;
  category: GrievanceCategory;
  description: string;
  status: GrievanceStatus;
  handledByName: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  raisedBy?: { id: string; firstName: string; lastName: string };
};

export async function createGrievance(body: { category: GrievanceCategory; description: string }): Promise<GrievanceCase> {
  return parseJson(await payrollFetchAuth('/api/v1/grievances', { method: 'POST', body: JSON.stringify(body) }));
}

export async function fetchMyGrievances(): Promise<GrievanceCase[]> {
  return parseJson(await payrollFetchAuth('/api/v1/grievances/me'));
}

export async function fetchAllGrievances(status?: string): Promise<GrievanceCase[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return parseJson(await payrollFetchAuth(`/api/v1/grievances${qs}`));
}

/** Non-sensitive cases raised by anyone on a team the caller leads. Empty for non-leads. */
export async function fetchTeamGrievances(): Promise<GrievanceCase[]> {
  return parseJson(await payrollFetchAuth('/api/v1/grievances/my-team'));
}

export async function updateGrievance(
  id: string,
  body: { status?: GrievanceStatus; resolutionNotes?: string },
): Promise<GrievanceCase> {
  return parseJson(await payrollFetchAuth(`/api/v1/grievances/${id}`, { method: 'PATCH', body: JSON.stringify(body) }));
}

// --- Attendance ---

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT';

export type AttendanceRecord = {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  status: AttendanceStatus;
  createdAt: string;
};

export async function clockIn(): Promise<AttendanceRecord> {
  return parseJson(await payrollFetchAuth('/api/v1/attendance/clock-in', { method: 'POST' }));
}

export async function clockOut(): Promise<AttendanceRecord> {
  return parseJson(await payrollFetchAuth('/api/v1/attendance/clock-out', { method: 'POST' }));
}

export async function fetchMyAttendance(): Promise<AttendanceRecord[]> {
  return parseJson(await payrollFetchAuth('/api/v1/attendance/me'));
}

export type AttendanceNetworkPolicy = {
  tenantId: string;
  enabled: boolean;
  allowedCidrs: string[];
  callerIp?: string | null;
};

export async function fetchAttendanceNetworkPolicy(): Promise<AttendanceNetworkPolicy> {
  return parseJson(await payrollFetchAuth('/api/v1/attendance/network-policy'));
}

export async function updateAttendanceNetworkPolicy(
  body: Pick<AttendanceNetworkPolicy, 'enabled' | 'allowedCidrs'>,
): Promise<AttendanceNetworkPolicy> {
  return parseJson(
    await payrollFetchAuth('/api/v1/attendance/network-policy', { method: 'PUT', body: JSON.stringify(body) }),
  );
}

// --- Training ---

export type TrainingRecordStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type TrainingCourse = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  mandatory: boolean;
  dueDate: string | null;
  createdAt: string;
};

export type TrainingRecord = {
  id: string;
  tenantId: string;
  courseId: string;
  employeeId: string;
  status: TrainingRecordStatus;
  completedAt: string | null;
  createdAt: string;
  course: TrainingCourse;
};

export async function fetchTrainingCourses(): Promise<TrainingCourse[]> {
  return parseJson(await payrollFetchAuth('/api/v1/training/courses'));
}

export async function createTrainingCourse(body: {
  name: string;
  description?: string;
  mandatory?: boolean;
  dueDate?: string;
}): Promise<TrainingCourse> {
  return parseJson(await payrollFetchAuth('/api/v1/training/courses', { method: 'POST', body: JSON.stringify(body) }));
}

export async function deleteTrainingCourse(id: string): Promise<void> {
  await payrollFetchAuth(`/api/v1/training/courses/${id}`, { method: 'DELETE' });
}

export async function fetchMyTrainingRecords(): Promise<TrainingRecord[]> {
  return parseJson(await payrollFetchAuth('/api/v1/training/me'));
}

export async function updateMyTrainingRecord(recordId: string, status: 'IN_PROGRESS' | 'COMPLETED'): Promise<TrainingRecord> {
  return parseJson(
    await payrollFetchAuth(`/api/v1/training/me/${recordId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  );
}

export async function fetchEmployees(
  params?:
    | string
    | Record<string, string | number | boolean | undefined>,
): Promise<Employee[]> {
  const qs =
    typeof params === 'string'
      ? `?placementId=${encodeURIComponent(params)}`
      : params
        ? `?${new URLSearchParams(
            Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
              if (value !== undefined && value !== null && value !== '') acc[key] = String(value);
              return acc;
            }, {}),
          ).toString()}`
        : '';
  const r = await payrollFetch(`/api/v1/employees${qs}`);
  const result = await parseJson<Employee[] | { data: Employee[] }>(r);
  return Array.isArray(result) ? result : result.data;
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const r = await payrollFetch(`/api/v1/employees/${id}`);
  return parseJson(r);
}

export async function createEmployee(body: {
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  basicSalary?: number;
  /** @deprecated use basicSalary */
  baseSalary?: number;
  startDate?: string;
  placementId?: string;
  candidateId?: string;
}): Promise<Employee> {
  const r = await payrollFetch('/api/v1/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function createEmployeeFromPlacement(body: {
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  baseSalary?: number;
  startDate?: string;
  placementId?: string;
  candidateId?: string;
}): Promise<Employee> {
  const r = await payrollFetch('/api/v1/employees/from-placement', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export type EmployeeBulkImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
  phone?: string;
  department?: string;
  clientId?: string;
  basicSalary?: number;
  rssbNumber?: string;
  ramaEnabled?: boolean;
};

export type EmployeeBulkImportResult = {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
};

export async function bulkImportEmployees(
  rows: EmployeeBulkImportRow[],
): Promise<EmployeeBulkImportResult> {
  const r = await payrollFetch('/api/v1/employees/import/csv', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
  return parseJson(r);
}

export type ConsultantBulkImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  startDate: string;
  clientName: string;
  phone?: string;
  department?: string;
  clientId?: string;
  basicSalary?: number;
  roleName?: string;
  deploymentSite?: string;
  employmentType?: string;
  monthlyFee?: number;
  currency?: string;
  noticePeriodDays?: number;
};

export type ConsultantBulkImportResult = {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
};

export async function bulkImportConsultants(
  rows: ConsultantBulkImportRow[],
): Promise<ConsultantBulkImportResult> {
  const r = await payrollFetch('/api/v1/outsourcing/consultants/import/csv', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
  return parseJson(r);
}

export async function fetchPayrollConfigClients(): Promise<{ clientId: string }[]> {
  const r = await payrollFetch('/api/v1/payroll/config/clients');
  return parseJson(r);
}

export async function fetchPayrollConfig(clientId?: string): Promise<PayrollConfig> {
  const r = await payrollFetch(`/api/v1/payroll/config${clientId ? `/${clientId}` : ''}`);
  return parseJson(r);
}

export async function createPayrollConfig(body: Record<string, unknown>): Promise<PayrollConfig> {
  const r = await payrollFetch('/api/v1/payroll/config', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function updatePayrollConfig(
  clientIdOrBody: string | Partial<PayrollConfig>,
  maybeBody?: Partial<PayrollConfig>,
): Promise<PayrollConfig> {
  const clientId = typeof clientIdOrBody === 'string' ? clientIdOrBody : undefined;
  const body = typeof clientIdOrBody === 'string' ? maybeBody : clientIdOrBody;
  const r = await payrollFetch(`/api/v1/payroll/config${clientId ? `/${clientId}` : ''}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function fetchPayrollRuns(): Promise<PayrollRun[]> {
  const r = await payrollFetch('/api/v1/payroll/runs');
  return parseJson(r);
}

export async function fetchPayrollRun(id: string): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}`);
  return parseJson(r);
}

export async function createPayrollRun(body: {
  clientId: string;
  periodYear: number;
  periodMonth: number;
}): Promise<PayrollRun> {
  const r = await payrollFetch('/api/v1/payroll/runs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function submitPayrollRun(id: string): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(r);
}

export async function lockPayrollRun(id: string): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/finalize`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(r);
}

export async function recalculatePayrollRun(id: string): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/run`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(r);
}

export async function updatePayrollLine(
  runId: string,
  lineId: string,
  body: { grossPay?: number; totalDeductions?: number },
): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${runId}/lines/${lineId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function approvePayrollStage(
  runId: string,
  _stage: string,
  note?: string,
): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${runId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comments: note }),
  });
  return parseJson(r);
}

export async function rejectPayrollStage(
  runId: string,
  _stage: string,
  note?: string,
): Promise<PayrollRun> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${runId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comments: note }),
  });
  return parseJson(r);
}

export async function fetchRunApprovals(runId: string) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${runId}/approvals`);
  return parseJson(r);
}

export function reportDownloadUrl(runId: string, kind: 'paye' | 'rssb' | 'bank-file'): string {
  return `${payrollUrl()}/api/v1/payroll/runs/${runId}/reports/${kind}?format=csv`;
}

export function payslipZipUrl(runId: string): string {
  return `${payrollUrl()}/api/v1/payroll/runs/${runId}/payslips.zip`;
}

export async function emailPayslips(runId: string, employeeIds?: string[]): Promise<{ emailedCount: number }> {
  const r = await payrollFetch(`/api/v1/payroll/runs/${runId}/payslips/email`, {
    method: 'POST',
    body: JSON.stringify({ employeeIds }),
  });
  return parseJson(r);
}

// ── Outsourcing Assignments ───────────────────────────────────────

export async function fetchOutsourcingAssignments(
  params?: Record<string, string>,
): Promise<OutsourcingAssignment[]> {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const r = await payrollFetch(`/api/v1/outsourcing/assignments${qs}`);
  return parseJson(r);
}

export async function fetchOutsourcingBench(): Promise<OutsourcingAssignment[]> {
  const r = await payrollFetch('/api/v1/outsourcing/bench');
  return parseJson(r);
}

export async function createOutsourcingAssignment(body: {
  employeeId: string;
  clientName: string;
  clientId?: string;
  roleName: string;
  deploymentSite?: string;
  employmentType?: string;
  startDate: string;
  endDate?: string;
  monthlyFee?: number;
  currency?: string;
  noticePeriodDays?: number;
}): Promise<OutsourcingAssignment> {
  const r = await payrollFetch('/api/v1/outsourcing/assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function updateOutsourcingAssignment(
  id: string,
  body: Partial<{
    clientName: string;
    roleName: string;
    deploymentSite: string;
    deploymentStatus: DeploymentStatus;
    employmentType: OutsourcingEmploymentType;
    endDate: string;
    availabilityDate: string;
    monthlyFee: number;
    currency: string;
    noticePeriodDays: number;
    transferReason: string;
  }>,
): Promise<OutsourcingAssignment> {
  const r = await payrollFetch(`/api/v1/outsourcing/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function fetchDeploymentHistory(assignmentId: string): Promise<DeploymentHistoryEntry[]> {
  const r = await payrollFetch(`/api/v1/outsourcing/assignments/${assignmentId}/history`);
  return parseJson(r);
}

// ── Secondment Contracts ──────────────────────────────────────────

export async function fetchSecondmentContracts(
  params?: Record<string, string>,
): Promise<SecondmentContract[]> {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const r = await payrollFetch(`/api/v1/outsourcing/contracts${qs}`);
  return parseJson(r);
}

export async function createSecondmentContract(body: {
  assignmentId: string;
  contractRef?: string;
  clientName: string;
  role: string;
  billingRate: number;
  currency?: string;
  workingHoursPerWeek?: number;
  noticePeriodDays?: number;
  governingLaw?: string;
  startDate: string;
  endDate?: string;
  renewalDate?: string;
}): Promise<SecondmentContract> {
  const r = await payrollFetch('/api/v1/outsourcing/contracts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function updateSecondmentContract(
  id: string,
  body: Partial<{
    contractRef: string;
    role: string;
    billingRate: number;
    workingHoursPerWeek: number;
    noticePeriodDays: number;
    governingLaw: string;
    endDate: string;
    renewalDate: string;
    amendmentReason: string;
  }>,
): Promise<SecondmentContract> {
  const r = await payrollFetch(`/api/v1/outsourcing/contracts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function terminateSecondmentContract(
  id: string,
  body: { reason: string; terminationDate?: string },
): Promise<SecondmentContract> {
  const r = await payrollFetch(`/api/v1/outsourcing/contracts/${id}/terminate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function renewSecondmentContract(
  id: string,
  body: { newEndDate: string; renewalDate?: string; billingRate?: number; notes?: string },
): Promise<SecondmentContract> {
  const r = await payrollFetch(`/api/v1/outsourcing/contracts/${id}/renew`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function fetchContractAmendments(contractId: string): Promise<ContractAmendment[]> {
  const r = await payrollFetch(`/api/v1/outsourcing/contracts/${contractId}/amendments`);
  return parseJson(r);
}

// ── Billing ───────────────────────────────────────────────────────

export type OutsourcingBillingSummary = {
  period: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  lineCount: number;
  lines: Array<{
    assignmentId: string;
    employeeId: string;
    employeeName: string;
    clientName: string;
    clientId: string | null;
    roleName: string;
    deploymentSite: string | null;
    billingRate: string;
    currency: string;
    period: string;
  }>;
  byClient: Record<string, OutsourcingBillingSummary['lines']>;
  totalsByCurrency: Record<string, string>;
};

export async function fetchOutsourcingBilling(period: string): Promise<OutsourcingBillingSummary> {
  const r = await payrollFetch(`/api/v1/outsourcing/billing/${encodeURIComponent(period)}`);
  return parseJson(r);
}

export type EmployeeP9Report = {
  employeeId: string;
  employeeCode: string | null;
  employeeName: string;
  year: number;
  currency: string;
  reportType: string;
  periods: Array<{
    periodYear: number;
    periodMonth: number;
    grossPay: string;
    deductions: string;
    netPay: string;
    paye: string;
    rssbPension: string;
    rssbMedical: string;
  }>;
  totals: Record<string, string>;
};

export async function fetchEmployeeP9(employeeId: string, year: number): Promise<EmployeeP9Report> {
  const r = await payrollFetch(`/api/v1/payroll/employees/${employeeId}/p9?year=${year}`);
  return parseJson(r);
}

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const r = await payrollFetch('/api/v1/hr/leave-types');
  return parseJson(r);
}

export type Holiday = {
  id: string;
  tenantId: string;
  name: string;
  month: number;
  day: number;
  note: string | null;
  nextDate: string;
};

export async function fetchHolidays(): Promise<Holiday[]> {
  const r = await payrollFetch('/api/v1/hr/holidays');
  return parseJson(r);
}

export async function createHoliday(body: { name: string; month: number; day: number; note?: string }): Promise<Holiday> {
  const r = await payrollFetch('/api/v1/hr/holidays', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function updateHoliday(
  id: string,
  body: Partial<{ name: string; month: number; day: number; note: string }>,
): Promise<Holiday> {
  const r = await payrollFetch(`/api/v1/hr/holidays/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function deleteHoliday(id: string): Promise<void> {
  await payrollFetch(`/api/v1/hr/holidays/${id}`, { method: 'DELETE' });
}

export type TeamOutRequest = LeaveRequest & {
  employee: { id: string; firstName: string; lastName: string; jobTitle?: string };
};

export async function fetchTeamOut(start: string, end: string): Promise<TeamOutRequest[]> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/team-out?start=${start}&end=${end}`);
  return parseJson(r);
}

export type LeaveRequestFilters = {
  status?: string;
  employeeId?: string;
  department?: string;
  leaveTypeId?: string;
  managerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export async function fetchLeaveRequests(
  status?: string,
  employeeId?: string,
  filters?: Omit<LeaveRequestFilters, 'status' | 'employeeId'>,
): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (employeeId) params.set('employeeId', employeeId);
  if (filters?.department) params.set('department', filters.department);
  if (filters?.leaveTypeId) params.set('leaveTypeId', filters.leaveTypeId);
  if (filters?.managerId) params.set('managerId', filters.managerId);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const r = await payrollFetch(`/api/v1/hr/leave-requests${qs}`);
  return parseJson(r);
}

export async function fetchLeaveRequest(id: string): Promise<LeaveRequest> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${id}`);
  return r.data as LeaveRequest;
}

export async function updateLeaveRequest(
  id: string,
  body: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    days?: number;
    reason?: string;
    delegateToEmployeeId?: string;
    emergencyContactPhone?: string;
  },
): Promise<LeaveRequest> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return r.data as LeaveRequest;
}

export async function cancelLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return r.data as LeaveRequest;
}

export async function createLeaveRequest(body: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;
  attachmentS3Key?: string;
  delegateToEmployeeId?: string;
  emergencyContactPhone?: string;
}): Promise<LeaveRequest> {
  const r = await payrollFetch('/api/v1/hr/leave-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function uploadLeaveAttachment(
  leaveRequestId: string,
  file: File,
): Promise<{ uploadUrl: string; objectKey: string }> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${leaveRequestId}/attachment`, {
    method: 'POST',
    body: JSON.stringify({ contentType: file.type || 'application/octet-stream', fileSize: file.size }),
  });
  const presign = await parseJson<{ uploadUrl: string; objectKey: string }>(r);
  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) throw new Error('Failed to upload attachment');
  return presign;
}

export async function approveLeaveRequest(id: string, note?: string): Promise<LeaveRequest> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  return parseJson(r);
}

export async function rejectLeaveRequest(id: string, note?: string): Promise<LeaveRequest> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  return parseJson(r);
}

export async function requestMoreInfoOnLeave(id: string, note: string): Promise<{ requested: boolean }> {
  const r = await payrollFetch(`/api/v1/hr/leave-requests/${id}/request-info`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  return parseJson(r);
}

export async function fetchEmployeeOnboarding(employeeId: string): Promise<EmployeeOnboarding | null> {
  const r = await payrollFetch(`/api/v1/hr/onboarding/employees/${employeeId}`);
  const data = await parseJson<EmployeeOnboarding | null>(r);
  return data ?? null;
}

export async function startEmployeeOnboarding(
  employeeId: string,
  templateId?: string,
): Promise<EmployeeOnboarding> {
  const r = await payrollFetch(`/api/v1/hr/onboarding/employees/${employeeId}`, {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
  return parseJson(r);
}

export async function toggleOnboardingItem(
  employeeId: string,
  itemId: string,
  done: boolean,
): Promise<EmployeeOnboarding> {
  const r = await payrollFetch(`/api/v1/hr/onboarding/employees/${employeeId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  });
  return parseJson(r);
}

export async function fetchEmployeeOffboarding(employeeId: string): Promise<EmployeeOffboarding | null> {
  const r = await payrollFetch(`/api/v1/hr/offboarding/employees/${employeeId}`);
  const data = await parseJson<EmployeeOffboarding | null>(r);
  return data ?? null;
}

export async function startEmployeeOffboarding(
  employeeId: string,
  finalPayNote?: string,
): Promise<EmployeeOffboarding> {
  const r = await payrollFetch(`/api/v1/hr/offboarding/employees/${employeeId}`, {
    method: 'POST',
    body: JSON.stringify({ finalPayNote }),
  });
  return parseJson(r);
}

export async function toggleOffboardingItem(
  employeeId: string,
  itemId: string,
  done: boolean,
  finalPayNote?: string,
): Promise<EmployeeOffboarding> {
  const r = await payrollFetch(`/api/v1/hr/offboarding/employees/${employeeId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ done, finalPayNote }),
  });
  return parseJson(r);
}

// Phase 3 endpoints
export async function updateEmployee(id: string, data: Record<string, unknown>) {
  const r = await payrollFetch(`/api/v1/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  return parseJson(r);
}

export async function terminateEmployee(id: string) {
  const r = await payrollFetch(`/api/v1/employees/${id}`, { method: 'DELETE' });
  return parseJson(r);
}

export async function fetchContracts(employeeId: string) {
  const r = await payrollFetch(`/api/v1/employees/${employeeId}/contracts`);
  return parseJson(r);
}

/** Self-service: the caller's own contracts. No admin role required. */
export async function fetchMyContracts() {
  const r = await payrollFetch('/api/v1/employees/me/contracts');
  return parseJson(r);
}

export async function createContract(employeeId: string, data: Record<string, unknown>) {
  const r = await payrollFetch(`/api/v1/employees/${employeeId}/contracts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return parseJson(r);
}

export async function updateContract(id: string, data: Record<string, unknown>) {
  const r = await payrollFetch(`/api/v1/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  return parseJson(r);
}

export async function uploadContractFile(id: string, contentType: string, fileSize: number) {
  const r = await payrollFetch(`/api/v1/contracts/${id}/upload`, {
    method: 'POST',
    body: JSON.stringify({ contentType, fileSize }),
  });
  return parseJson(r);
}

export async function fetchExpiringContracts(days = 30) {
  const r = await payrollFetch(`/api/v1/contracts/expiring?days=${days}`);
  return parseJson(r);
}

export async function fetchPeriods(params?: Record<string, string | number | undefined>) {
  const query = params
    ? `?${new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined && v !== null && v !== '') acc[k] = String(v);
          return acc;
        }, {}),
      )}`
    : '';
  const r = await payrollFetch(`/api/v1/payroll/runs${query}`);
  return parseJson(r);
}

export async function fetchPeriod(id: string) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}`);
  return parseJson(r);
}

export async function createPeriod(data: Record<string, unknown>) {
  const r = await payrollFetch('/api/v1/payroll/runs', { method: 'POST', body: JSON.stringify(data) });
  return parseJson(r);
}

export async function runPayroll(id: string) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/run`, { method: 'POST', body: JSON.stringify({}) });
  return parseJson(r);
}

export async function submitPayroll(id: string) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/submit`, { method: 'POST', body: JSON.stringify({}) });
  return parseJson(r);
}

export async function approvePayroll(id: string, data?: Record<string, unknown>) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
  return parseJson(r);
}

export async function rejectPayroll(id: string, comments?: string) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
  return parseJson(r);
}

export async function finalizePayroll(id: string) {
  const r = await payrollFetch(`/api/v1/payroll/runs/${id}/finalize`, { method: 'POST', body: JSON.stringify({}) });
  return parseJson(r);
}

export const downloadPAYEReport = (periodId: string) =>
  window.open(`${payrollUrl()}/api/v1/payroll/reports/paye?periodId=${periodId}`, '_blank');
export const downloadRSSBReport = (periodId: string) =>
  window.open(`${payrollUrl()}/api/v1/payroll/reports/rssb?periodId=${periodId}`, '_blank');
export const downloadBankFile = (periodId: string) =>
  window.open(`${payrollUrl()}/api/v1/payroll/reports/bank-file/${periodId}`, '_blank');

export async function fetchEmployeePayslips(employeeId: string) {
  const r = await payrollFetch(`/api/v1/payroll/payslips/${employeeId}`);
  return parseJson(r);
}

/** Self-service: the caller's own payslips. No admin role required. */
export async function fetchMyPayslips() {
  const r = await payrollFetch('/api/v1/payroll/payslips/me');
  return parseJson(r);
}

export async function fetchPeriodPayslips(periodId: string) {
  const r = await payrollFetch(`/api/v1/payroll/periods/${periodId}/payslips`);
  return parseJson(r);
}

export type LeaveBalance = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: string;
  usedDays: string;
  leaveType?: LeaveType;
};

export async function fetchLeaveBalances(employeeId: string, year?: number): Promise<LeaveBalance[]> {
  const query = year ? `?employeeId=${employeeId}&year=${year}` : `?employeeId=${employeeId}`;
  const r = await payrollFetch(`/api/v1/hr/leave-balances${query}`);
  return parseJson(r);
}

// --- PERFORMANCE API ---

export async function fetchAppraisalCycles() {
  const r = await payrollFetch('/api/v1/performance/cycles');
  return parseJson(r);
}

export async function createAppraisalCycle(body: any) {
  const r = await payrollFetch('/api/v1/performance/cycles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function updateAppraisalCycleStatus(id: string, status: string) {
  const r = await payrollFetch(`/api/v1/performance/cycles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return parseJson(r);
}

export async function fetchGoals(employeeId?: string, appraisalCycleId?: string) {
  let query = '';
  const params: string[] = [];
  if (employeeId) params.push(`employeeId=${employeeId}`);
  if (appraisalCycleId) params.push(`appraisalCycleId=${appraisalCycleId}`);
  if (params.length > 0) query = `?${params.join('&')}`;

  const r = await payrollFetch(`/api/v1/performance/goals${query}`);
  return parseJson(r);
}

export async function createGoal(body: any) {
  const r = await payrollFetch('/api/v1/performance/goals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function updateGoal(id: string, body: any) {
  const r = await payrollFetch(`/api/v1/performance/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function deleteGoal(id: string) {
  const r = await payrollFetch(`/api/v1/performance/goals/${id}`, {
    method: 'DELETE',
  });
  return parseJson(r);
}

export async function fetchGoalTemplates() {
  const r = await payrollFetch('/api/v1/performance/goals/templates');
  return parseJson(r);
}

export async function createGoalTemplate(body: any) {
  const r = await payrollFetch('/api/v1/performance/goals/templates', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function fetchCompetencyFramework() {
  const r = await payrollFetch('/api/v1/performance/competencies');
  return parseJson(r);
}

export async function fetchAppraisals(employeeId?: string, managerId?: string) {
  let query = '';
  const params: string[] = [];
  if (employeeId) params.push(`employeeId=${employeeId}`);
  if (managerId) params.push(`managerId=${managerId}`);
  if (params.length > 0) query = `?${params.join('&')}`;

  const r = await payrollFetch(`/api/v1/performance/appraisals${query}`);
  return parseJson(r);
}

export async function fetchAppraisal(id: string) {
  const r = await payrollFetch(`/api/v1/performance/appraisals/${id}`);
  return parseJson(r);
}

export async function submitSelfAssessment(id: string, body: any) {
  const r = await payrollFetch(`/api/v1/performance/appraisals/${id}/self-assess`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function submitManagerReview(id: string, body: any) {
  const r = await payrollFetch(`/api/v1/performance/appraisals/${id}/manager-review`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function submitHRValidation(id: string, body: any) {
  const r = await payrollFetch(`/api/v1/performance/appraisals/${id}/hr-validate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function fetchFeedbackRequests(reviewerId?: string, employeeId?: string) {
  let query = '';
  const params: string[] = [];
  if (reviewerId) params.push(`reviewerId=${reviewerId}`);
  if (employeeId) params.push(`employeeId=${employeeId}`);
  if (params.length > 0) query = `?${params.join('&')}`;

  const r = await payrollFetch(`/api/v1/performance/360-feedback/requests${query}`);
  return parseJson(r);
}

export async function createFeedbackRequest(body: any) {
  const r = await payrollFetch('/api/v1/performance/360-feedback/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function submitFeedbackResponse(requestId: string, body: any) {
  const r = await payrollFetch(`/api/v1/performance/360-feedback/requests/${requestId}/response`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export type PipStatus = 'ACTIVE' | 'EXTENDED' | 'SUCCEEDED' | 'ESCALATED' | 'CLOSED';

export type PipCheckIn = {
  id: string;
  pipId: string;
  note: string;
  status: string | null;
  createdAt: string;
};

export type PerformanceImprovementPlan = {
  id: string;
  tenantId: string;
  employeeId: string;
  appraisalId: string | null;
  managerId: string | null;
  reason: string;
  objectives: string;
  supportProvided: string | null;
  startDate: string;
  reviewDate: string;
  endDate: string | null;
  status: PipStatus;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { firstName: string; lastName: string; jobTitle?: string };
  checkIns?: PipCheckIn[];
};

export async function fetchPips(employeeId?: string, status?: string): Promise<PerformanceImprovementPlan[]> {
  const params: string[] = [];
  if (employeeId) params.push(`employeeId=${employeeId}`);
  if (status) params.push(`status=${status}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  const r = await payrollFetch(`/api/v1/performance/pips${query}`);
  return parseJson(r);
}

export async function fetchPip(id: string): Promise<PerformanceImprovementPlan> {
  const r = await payrollFetch(`/api/v1/performance/pips/${id}`);
  return parseJson(r);
}

export async function createPip(body: {
  employeeId: string;
  appraisalId?: string;
  managerId?: string;
  reason: string;
  objectives: string;
  supportProvided?: string;
  startDate: string;
  reviewDate: string;
}): Promise<PerformanceImprovementPlan> {
  const r = await payrollFetch('/api/v1/performance/pips', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function updatePip(
  id: string,
  body: Partial<{ status: PipStatus; reviewDate: string; endDate: string; outcome: string }>,
): Promise<PerformanceImprovementPlan> {
  const r = await payrollFetch(`/api/v1/performance/pips/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function addPipCheckIn(id: string, body: { note: string; status?: string }): Promise<PipCheckIn> {
  const r = await payrollFetch(`/api/v1/performance/pips/${id}/check-ins`, { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export type PermitType = 'WORK_PERMIT' | 'VISA' | 'RESIDENCE_PERMIT';
export type PermitStatus = 'APPROVED' | 'EXPIRED' | 'REVOKED';
export type ChecklistItemStatus = 'PENDING' | 'UPLOADED' | 'VERIFIED';

export type PermitChecklistItem = {
  id: string;
  permitId: string;
  documentName: string;
  status: ChecklistItemStatus;
  fileKey: string | null;
};

export type Permit = {
  id: string;
  tenantId: string;
  employeeId: string;
  permitNumber: string;
  permitType: PermitType;
  country: string;
  expiryDate: string;
  status: PermitStatus;
  createdAt: string;
  updatedAt: string;
  employee?: { firstName: string; lastName: string; email?: string };
  checklistItems?: PermitChecklistItem[];
};

export async function fetchPermits(status?: string): Promise<Permit[]> {
  const query = status ? `?status=${status}` : '';
  const r = await payrollFetch(`/api/v1/permits${query}`);
  return parseJson(r);
}

export async function fetchPermit(id: string): Promise<Permit> {
  const r = await payrollFetch(`/api/v1/permits/${id}`);
  return parseJson(r);
}

export async function createPermit(body: {
  employeeId: string;
  permitNumber: string;
  permitType: PermitType;
  country?: string;
  expiryDate: string;
}): Promise<Permit> {
  const r = await payrollFetch('/api/v1/permits', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function updatePermitChecklistItem(
  permitId: string,
  itemId: string,
  body: { status: ChecklistItemStatus; fileKey?: string },
): Promise<PermitChecklistItem> {
  const r = await payrollFetch(`/api/v1/permits/${permitId}/checklist/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

// --- KPIs ---

export type KpiPeriodStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type KpiStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TeamKpiStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type KpiPeriod = {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: KpiPeriodStatus;
};

export type Kpi = {
  id: string;
  tenantId: string;
  employeeId: string;
  kpiPeriodId: string | null;
  title: string;
  description: string | null;
  target: string;
  measurementMethod: string;
  weight: string;
  deadline: string;
  status: KpiStatus;
  progress: string;
  managerComment: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { firstName: string; lastName: string; jobTitle?: string };
  kpiPeriod?: KpiPeriod;
};

export type TeamKpiRollup = {
  memberCount: number;
  approvedKpiCount: number;
  avgProgress: number;
};

export type TeamKpiSubmission = TeamKpiRollup & {
  id: string;
  tenantId: string;
  teamId: string;
  teamLeaderId: string;
  kpiPeriodId: string;
  status: TeamKpiStatus;
  summary: string | null;
  submittedAt: string | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  team?: Team;
  period?: KpiPeriod;
};

export async function fetchKpiPeriods(): Promise<KpiPeriod[]> {
  const r = await payrollFetch('/api/v1/performance/kpi-periods');
  return parseJson(r);
}

export async function createKpiPeriod(body: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<KpiPeriod> {
  const r = await payrollFetch('/api/v1/performance/kpi-periods', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function fetchKpis(params?: {
  employeeId?: string;
  kpiPeriodId?: string;
  status?: string;
  forReview?: boolean;
}): Promise<Kpi[]> {
  const q: string[] = [];
  if (params?.employeeId) q.push(`employeeId=${params.employeeId}`);
  if (params?.kpiPeriodId) q.push(`kpiPeriodId=${params.kpiPeriodId}`);
  if (params?.status) q.push(`status=${params.status}`);
  if (params?.forReview) q.push('forReview=true');
  const query = q.length > 0 ? `?${q.join('&')}` : '';
  const r = await payrollFetch(`/api/v1/performance/kpis${query}`);
  return parseJson(r);
}

export async function createKpi(body: {
  kpiPeriodId: string;
  title: string;
  description?: string;
  target: string;
  measurementMethod: string;
  weight: number;
  deadline: string;
}): Promise<Kpi> {
  const r = await payrollFetch('/api/v1/performance/kpis', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function submitKpi(id: string): Promise<Kpi> {
  const r = await payrollFetch(`/api/v1/performance/kpis/${id}/submit`, { method: 'PATCH' });
  return parseJson(r);
}

export async function updateKpiProgress(id: string, progress: number): Promise<Kpi> {
  const r = await payrollFetch(`/api/v1/performance/kpis/${id}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ progress }),
  });
  return parseJson(r);
}

export async function decideKpi(
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; managerComment?: string },
): Promise<Kpi> {
  const r = await payrollFetch(`/api/v1/performance/kpis/${id}/decision`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function previewTeamKpi(teamId: string, kpiPeriodId: string): Promise<TeamKpiRollup> {
  const r = await payrollFetch(`/api/v1/performance/team-kpis/preview?teamId=${teamId}&kpiPeriodId=${kpiPeriodId}`);
  return parseJson(r);
}

export async function fetchTeamKpis(params?: {
  kpiPeriodId?: string;
  status?: string;
}): Promise<TeamKpiSubmission[]> {
  const q: string[] = [];
  if (params?.kpiPeriodId) q.push(`kpiPeriodId=${params.kpiPeriodId}`);
  if (params?.status) q.push(`status=${params.status}`);
  const query = q.length > 0 ? `?${q.join('&')}` : '';
  const r = await payrollFetch(`/api/v1/performance/team-kpis${query}`);
  return parseJson(r);
}

export async function submitTeamKpi(body: {
  teamId: string;
  kpiPeriodId: string;
  summary?: string;
}): Promise<TeamKpiSubmission> {
  const r = await payrollFetch('/api/v1/performance/team-kpis', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function decideTeamKpi(
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; reviewComment?: string },
): Promise<TeamKpiSubmission> {
  const r = await payrollFetch(`/api/v1/performance/team-kpis/${id}/decision`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

// --- Teams (Departments / Org Structure) ---

export type TeamMemberRole = 'LEAD' | 'CORE' | 'MEMBER';

export type TeamMember = {
  id: string;
  tenantId: string;
  teamId: string;
  employeeId: string;
  role: TeamMemberRole;
  createdAt: string;
  employee?: { id: string; firstName: string; lastName: string; jobTitle?: string; email?: string };
};

export type Team = {
  id: string;
  tenantId: string;
  name: string;
  parentTeamId: string | null;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
};

export type MyTeam = Team & { myRole: TeamMemberRole };

export async function fetchTeams(): Promise<Team[]> {
  const r = await payrollFetch('/api/v1/teams');
  return parseJson(r);
}

export async function fetchMyTeams(): Promise<MyTeam[]> {
  const r = await payrollFetch('/api/v1/teams/mine');
  return parseJson(r);
}

export async function createTeam(body: { name: string; parentTeamId?: string }): Promise<Team> {
  const r = await payrollFetch('/api/v1/teams', { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function updateTeam(
  id: string,
  body: { name?: string; parentTeamId?: string | null },
): Promise<Team> {
  const r = await payrollFetch(`/api/v1/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function deleteTeam(id: string): Promise<void> {
  await payrollFetch(`/api/v1/teams/${id}`, { method: 'DELETE' });
}

export async function addTeamMember(
  teamId: string,
  body: { employeeId: string; role?: TeamMemberRole },
): Promise<TeamMember> {
  const r = await payrollFetch(`/api/v1/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(body) });
  return parseJson(r);
}

export async function updateTeamMember(
  teamId: string,
  employeeId: string,
  body: { role: TeamMemberRole },
): Promise<TeamMember> {
  const r = await payrollFetch(`/api/v1/teams/${teamId}/members/${employeeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseJson(r);
}

export async function removeTeamMember(teamId: string, employeeId: string): Promise<void> {
  await payrollFetch(`/api/v1/teams/${teamId}/members/${employeeId}`, { method: 'DELETE' });
}

// --- Document catalog ---

export type DocumentCatalogEntry = {
  id: string;
  category: string;
  name: string;
  subjectName: string;
  uploadedAt: string;
  expiryDate: string | null;
  downloadUrl: string | null;
};

export async function fetchEmployeeDocumentCatalog(search?: string): Promise<DocumentCatalogEntry[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const r = await payrollFetch(`/api/v1/employees/documents/all${qs}`);
  return parseJson(r);
}

