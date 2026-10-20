import type { ModuleManifest } from './types';

/**
 * Product module catalog — source of truth for IDs, dependencies, and host services.
 * Phase 1 will persist entitlements in platform-service; until then this catalog
 * documents intent and drives capabilities seed defaults.
 */
export const MODULE_CATALOG: Record<ModuleManifest['id'], ModuleManifest> = {
  core: {
    id: 'core',
    version: '0.1.0',
    displayName: 'Core Platform',
    dependencies: [],
    hostService: 'platform-service + identity-service',
    apiPrefix: '/api/v1',
    permissions: [
      { id: 'tenant:settings', description: 'Manage tenant settings' },
      { id: 'user:manage', description: 'Manage tenant users' },
    ],
    menuContributions: [
      { id: 'platform-home', label: 'Dashboard', pathPrefix: '/platform' },
      { id: 'platform-settings', label: 'Settings', pathPrefix: '/platform/settings', permission: 'tenant:settings' },
    ],
    eventsPublished: [{ name: 'TenantActivated.v1', description: 'Tenant approved and active' }],
    eventsConsumed: [],
  },

  'hr-employee': {
    id: 'hr-employee',
    version: '0.1.0',
    displayName: 'Employee / Core HR',
    dependencies: ['core'],
    hostService: 'payroll-service',
    apiPrefix: '/api/v1/employees',
    permissions: [
      { id: 'employee:read', description: 'View employee records' },
      { id: 'employee:write', description: 'Create and update employees' },
    ],
    menuContributions: [
      { id: 'payroll-employees', label: 'Employees', pathPrefix: '/payroll/employees', permission: 'employee:read' },
    ],
    eventsPublished: [{ name: 'EmployeeCreated.v1', description: 'Employee master record created' }],
    eventsConsumed: [{ name: 'EmployeeHired.v1', description: 'Create employee from recruitment placement' }],
  },

  leave: {
    id: 'leave',
    version: '0.1.0',
    displayName: 'Leave Management',
    dependencies: ['core', 'hr-employee'],
    hostService: 'payroll-service',
    apiPrefix: '/api/v1/leave',
    permissions: [
      { id: 'leave:apply', description: 'Submit own leave requests' },
      { id: 'leave:approve', description: 'Approve leave requests' },
    ],
    menuContributions: [{ id: 'leave', label: 'Leave', pathPrefix: '/leave', permission: 'leave:apply' }],
    eventsPublished: [{ name: 'LeaveApproved.v1', description: 'Leave request approved' }],
    eventsConsumed: [],
  },

  payroll: {
    id: 'payroll',
    version: '0.1.0',
    displayName: 'Payroll',
    dependencies: ['core', 'hr-employee'],
    hostService: 'payroll-service',
    apiPrefix: '/api/v1/payroll',
    permissions: [
      { id: 'payroll:read', description: 'View payroll data' },
      { id: 'payroll:run', description: 'Run and submit payroll' },
    ],
    menuContributions: [{ id: 'payroll', label: 'Payroll', pathPrefix: '/payroll', permission: 'payroll:read' }],
    eventsPublished: [{ name: 'PayrollPeriodFinalized.v1', description: 'Payroll period locked/finalized' }],
    eventsConsumed: [{ name: 'LeaveApproved.v1', description: 'Optional unpaid leave adjustments' }],
  },

  recruitment: {
    id: 'recruitment',
    version: '0.1.0',
    displayName: 'Recruitment (ATS)',
    dependencies: ['core'],
    hostService: 'recruitment-service',
    apiPrefix: '/api/v1/jobs',
    permissions: [{ id: 'ats:write', description: 'Manage jobs and candidates' }],
    menuContributions: [
      { id: 'recruitment', label: 'Recruitment', pathPrefix: '/recruitment', permission: 'ats:write' },
    ],
    eventsPublished: [
      { name: 'OfferAccepted.v1', description: 'Candidate accepted offer' },
      { name: 'PlacementCompleted.v1', description: 'Placement recorded' },
    ],
    eventsConsumed: [],
  },

  'talent-pool': {
    id: 'talent-pool',
    version: '0.1.0',
    displayName: 'Talent Pool',
    dependencies: ['core', 'recruitment'],
    hostService: 'talent-pool-service',
    apiPrefix: '/api/v1/talent-pool',
    permissions: [{ id: 'ats:write', description: 'Shared with recruitment' }],
    menuContributions: [
      { id: 'talent-pool', label: 'Talent pool', pathPrefix: '/talent-pool', permission: 'ats:write' },
    ],
    eventsPublished: [],
    eventsConsumed: [],
  },

  performance: {
    id: 'performance',
    version: '0.1.0',
    displayName: 'Performance Management',
    dependencies: ['core', 'hr-employee'],
    hostService: 'payroll-service',
    apiPrefix: '/api/v1/performance',
    permissions: [{ id: 'performance:read', description: 'View goals and appraisals' }],
    menuContributions: [
      { id: 'performance', label: 'Performance', pathPrefix: '/performance', permission: 'performance:read' },
    ],
    eventsPublished: [],
    eventsConsumed: [],
  },
};

/** Default modules enabled for local demo tenant (Phase 1 will store per tenant). */
export const DEMO_TENANT_DEFAULT_MODULES: ModuleManifest['id'][] = [
  'core',
  'hr-employee',
  'leave',
  'payroll',
  'recruitment',
  'talent-pool',
  'performance',
];

export function getModuleManifest(id: ModuleManifest['id']): ModuleManifest {
  return MODULE_CATALOG[id];
}

export function listModuleIds(): ModuleManifest['id'][] {
  return Object.keys(MODULE_CATALOG) as ModuleManifest['id'][];
}
