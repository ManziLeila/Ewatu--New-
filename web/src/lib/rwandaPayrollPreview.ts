/** Client-side preview — mirrors services/payroll-service/src/calculation/*. */

export type RwandaPayrollConfig = {
  payeEnabled: boolean;
  rssbPensionEmployee: number;
  rssbPensionEmployer: number;
  rssbMedical: number;
  cbhiRate: number;
  maternityLevy: number;
  /** Employer occupational hazard (display / planning; 2% typical in Rwanda). */
  occupationalHazardRate: number;
};

export const RWANDA_PAYROLL_DEFAULTS: RwandaPayrollConfig = {
  payeEnabled: true,
  rssbPensionEmployee: 0.05,
  rssbPensionEmployer: 0.05,
  rssbMedical: 0.075,
  cbhiRate: 0.005,
  maternityLevy: 0.003,
  occupationalHazardRate: 0.02,
};

export type PayrollPreviewInput = {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  otherDeductions?: number;
  includeRama: boolean;
};

export type PayrollPreviewResult = {
  grossPay: number;
  paye: number;
  rssbEmployee: number;
  rssbMedicalEmployee: number;
  cbhi: number;
  totalEmployeeDeductions: number;
  netPay: number;
  netPaidToBank: number;
  rssbEmployer: number;
  rssbMedicalEmployer: number;
  maternityLevy: number;
  occupationalHazard: number;
};

function calculatePAYE(grossPay: number): number {
  if (grossPay <= 30000) return 0;
  if (grossPay <= 100000) return (grossPay - 30000) * 0.2;
  return 70000 * 0.2 + (grossPay - 100000) * 0.3;
}

export function previewRwandaPayroll(
  input: PayrollPreviewInput,
  config: RwandaPayrollConfig = RWANDA_PAYROLL_DEFAULTS,
): PayrollPreviewResult {
  const grossPay =
    input.basicSalary + input.housingAllowance + input.transportAllowance + input.otherAllowances;
  const paye = config.payeEnabled ? calculatePAYE(grossPay) : 0;
  const rssbEmployee = grossPay * config.rssbPensionEmployee;
  const rssbEmployer = grossPay * config.rssbPensionEmployer;
  const medicalRate = input.includeRama ? config.rssbMedical : 0;
  const rssbMedicalEmployee = grossPay * medicalRate;
  const rssbMedicalEmployer = grossPay * medicalRate;
  const cbhi = grossPay * config.cbhiRate;
  const otherDeductions = input.otherDeductions ?? 0;
  const totalEmployeeDeductions = paye + rssbEmployee + rssbMedicalEmployee + cbhi + otherDeductions;
  const netPay = grossPay - totalEmployeeDeductions;
  const maternityLevy = grossPay * config.maternityLevy;
  const occupationalHazard = grossPay * config.occupationalHazardRate;

  return {
    grossPay,
    paye,
    rssbEmployee,
    rssbMedicalEmployee,
    cbhi,
    totalEmployeeDeductions,
    netPay,
    netPaidToBank: netPay,
    rssbEmployer,
    rssbMedicalEmployer,
    maternityLevy,
    occupationalHazard,
  };
}

export function formatRwf(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `RWF ${n.toLocaleString('en-RW')}`;
}

export function pctLabel(rate: number): string {
  return `${(rate * 100).toFixed(rate * 1000 === Math.round(rate * 1000) ? 1 : 2).replace(/\.0$/, '')}%`;
}
