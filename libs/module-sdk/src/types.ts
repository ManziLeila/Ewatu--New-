/**
 * Logical product module contract (Phase 0 — types only; enforcement in Phase 1+).
 * Deployable services map to one or more module IDs via manifests in catalog.ts.
 */

export type ModuleId =
  | 'core'
  | 'hr-employee'
  | 'leave'
  | 'payroll'
  | 'recruitment'
  | 'talent-pool'
  | 'performance';

export type PermissionDef = {
  /** e.g. payroll:run */
  id: string;
  description: string;
};

export type MenuContribution = {
  /** Stable key for UI */
  id: string;
  label: string;
  /** App route path prefix */
  pathPrefix: string;
  /** Minimum permission (any match) — optional until capabilities API ships */
  permission?: string;
};

export type DomainEventDef = {
  /** Versioned name, e.g. EmployeeHired.v1 */
  name: string;
  description: string;
};

export type ModuleManifest = {
  id: ModuleId;
  version: string;
  displayName: string;
  /** Other module IDs that must be enabled (core is implicit) */
  dependencies: ModuleId[];
  /** Nest route prefix or public API segment */
  apiPrefix?: string;
  /** Service that hosts this module today (deployment map) */
  hostService: string;
  permissions: PermissionDef[];
  menuContributions: MenuContribution[];
  eventsPublished: DomainEventDef[];
  eventsConsumed: DomainEventDef[];
};

export type TenantCapabilities = {
  tenantId: string;
  enabledModules: ModuleId[];
  permissions: string[];
  menus: MenuContribution[];
};
