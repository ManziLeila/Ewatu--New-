import { calculatePayroll } from './payroll.calculator';
import { calculatePAYE } from './paye.calculator';

describe('calculatePAYE', () => {
  it('returns 0 for zero salary', () => {
    expect(calculatePAYE(0)).toBe(0);
  });

  it('returns 0 for salary at 25,000', () => {
    expect(calculatePAYE(25000)).toBe(0);
  });

  it('returns 0 for salary at 30,000 band boundary', () => {
    expect(calculatePAYE(30000)).toBe(0);
  });

  it('returns 6,000 for salary at 60,000', () => {
    expect(calculatePAYE(60000)).toBe(6000);
  });

  it('returns 14,000 for salary at 100,000 band boundary', () => {
    expect(calculatePAYE(100000)).toBe(14000);
  });

  it('returns 44,000 for salary at 200,000', () => {
    expect(calculatePAYE(200000)).toBe(44000);
  });

  it('returns 134,000 for salary at 500,000', () => {
    expect(calculatePAYE(500000)).toBe(134000);
  });
});

describe('calculatePayroll', () => {
  const rwandaConfig = {
    payeEnabled: true,
    rssbPensionEmployee: 0.05,
    rssbPensionEmployer: 0.05,
    rssbMedical: 0.075,
    cbhiRate: 0.005,
    maternityLevy: 0.003,
    occupationalHazardRate: 0.02,
  };

  it('calculates PAYE 6000 and netPay 46200 for basic salary 60000', () => {
    const result = calculatePayroll(
      {
        basicSalary: 60000,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        otherDeductions: 0,
      },
      rwandaConfig,
    );
    expect(result.paye).toBe(6000);
    expect(result.maternityLevy).toBe(180);
    expect(result.totalDeductions).toBe(13800);
    expect(result.netPay).toBe(46200);
    expect(result.employeeDeductions.totalDeductions).toBe(13800);
    expect(result.employerCosts.maternityLevy).toBe(180);
  });

  it('excludes maternity levy from employee totalDeductions', () => {
    const result = calculatePayroll(
      {
        basicSalary: 200000,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        otherDeductions: 0,
      },
      rwandaConfig,
    );
    expect(result.paye).toBe(44000);
    expect(result.totalDeductions).toBe(70000);
    expect(result.netPay).toBe(130000);
    expect(result.employerCosts.maternityLevy).toBe(600);
  });

  it('applies Rwanda pension, PAYE, and CBHI without any RSSB membership number (salary-driven only)', () => {
    const result = calculatePayroll(
      {
        basicSalary: 100000,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        otherDeductions: 0,
        includeRama: true,
      },
      rwandaConfig,
    );
    expect(result.paye).toBe(14000);
    expect(result.rssbEmployee).toBe(5000);
    expect(result.rssbEmployer).toBe(5000);
    expect(result.cbhi).toBe(500);
    expect(result.rssbMedical).toBe(7500);
  });

  it('still applies pension and PAYE when RAMA is excluded for an employee', () => {
    const result = calculatePayroll(
      {
        basicSalary: 100000,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        otherDeductions: 0,
        includeRama: false,
      },
      rwandaConfig,
    );
    expect(result.paye).toBe(14000);
    expect(result.rssbEmployee).toBe(5000);
    expect(result.rssbMedical).toBe(0);
    expect(result.cbhi).toBe(500);
  });

  it('calculates netPay 21750 for basic salary 25000', () => {
    const result = calculatePayroll(
      {
        basicSalary: 25000,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        otherDeductions: 0,
      },
      rwandaConfig,
    );
    expect(result.paye).toBe(0);
    expect(result.netPay).toBe(21750);
  });
});
