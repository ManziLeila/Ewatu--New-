import { useState } from 'react';
import { BRAND } from '../lib/brand';

interface EmployeeProfile {
  id: string;
  initials: string;
  name: string;
  title: string;
  department: string;
  leaveBalance: string;
  tenure: string;
  period: string;
  baseSalary: string;
  allowances: string;
  deductions: string;
  netPay: string;
  trend: string;
  avatarBg?: string;
}

const employees: EmployeeProfile[] = [
  {
    id: 'jane',
    initials: 'JD',
    name: 'Jane Doe',
    title: 'Senior Project Manager',
    department: 'Operations',
    leaveBalance: '18 days',
    tenure: '3.5 years',
    period: 'December 2024',
    baseSalary: 'RWF 850,000',
    allowances: '+RWF 120,000',
    deductions: '-RWF 85,000',
    netPay: 'RWF 885,000',
    trend: '+2.5% from last month',
    avatarBg: BRAND.primary,
  },
  {
    id: 'alex',
    initials: 'AN',
    name: 'Alex Nkurunziza',
    title: 'Lead Talent Consultant',
    department: 'Recruitment & HR',
    leaveBalance: '14 days',
    tenure: '2.1 years',
    period: 'December 2024',
    baseSalary: 'RWF 950,000',
    allowances: '+RWF 150,000',
    deductions: '-RWF 98,500',
    netPay: 'RWF 1,001,500',
    trend: '+4.0% from last month',
    avatarBg: BRAND.primaryDark,
  },
  {
    id: 'marie',
    initials: 'MU',
    name: 'Marie Uwase',
    title: 'Finance & Compliance Officer',
    department: 'Payroll & Finance',
    leaveBalance: '22 days',
    tenure: '4.0 years',
    period: 'December 2024',
    baseSalary: 'RWF 1,100,000',
    allowances: '+RWF 180,000',
    deductions: '-RWF 112,000',
    netPay: 'RWF 1,168,000',
    trend: '+1.8% from last month',
    avatarBg: BRAND.secondary,
  },
];

const hrFeatures = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Employee master data & org structure',
    desc: 'Centralized employee profiles, reporting hierarchies, and position management.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
      </svg>
    ),
    title: 'Departments, job titles, grades & reporting lines',
    desc: 'Structured organization levels, salary bands, and managerial sign-off paths.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Attendance, shifts, overtime & leave management',
    desc: 'Real-time leave balance tracking, shift scheduling, and manager approval queues.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: 'Payroll with salary structures, allowances & deductions',
    desc: 'Rwanda PAYE tax bands, RSSB pension (5%+5%), RAMA/CBHI, and customizable allowances.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
    title: 'Loans, advances, expense claims with approvals',
    desc: 'Employee loan schedules, salary advances, and multi-tier finance reimbursements.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'Employee & Company Contract Expiration Tracking',
    desc: 'B2B SLAs, employment contracts, secondments, and 30/60/90-day expiration alerts.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    title: 'Performance management with goals & appraisals',
    desc: 'Objective key results (OKRs), appraisal review cycles, and 360-degree feedback.',
  },
];

export function HrShowcaseSection() {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('jane');
  const activeEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];

  return (
    <section className="hr-showcase" id="hr-capabilities">
      <div className="hr-showcase__container">
        {/* Header Block */}
        <div className="hr-showcase__header">
          <h2 className="hr-showcase__title">
            End-to-End HR, Payroll & Workforce Management
          </h2>
          <p className="hr-showcase__subtitle">
            E-Watu covers the full HR lifecycle — from recruitment and onboarding to payroll processing and performance reviews. Fully integrated with Rwanda statutory compliance, client secondments, and multi-tenant security.
          </p>

          <div className="hr-showcase__badges">
            <span className="hr-showcase__badge">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" />
              </svg>
              RSSB Compliance
            </span>
            <span className="hr-showcase__badge">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" />
              </svg>
              Multi-branch & Client Support
            </span>
            <span className="hr-showcase__badge">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" />
              </svg>
              Self-service Portal
            </span>
            <span className="hr-showcase__badge">
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M13.5 3.5L6 11 2.5 7.5l-1 1L6 13l8.5-8.5z" />
              </svg>
              Automated Payslips
            </span>
          </div>
        </div>

        {/* 2-Column Showcase Content */}
        <div className="hr-showcase__grid">
          {/* Left Column: Feature Cards */}
          <div className="hr-showcase__features">
            {hrFeatures.map((feat) => (
              <div key={feat.title} className="hr-feature-card">
                <div className="hr-feature-card__icon">{feat.icon}</div>
                <div className="hr-feature-card__text">
                  <h3 className="hr-feature-card__title">{feat.title}</h3>
                  <p className="hr-feature-card__desc">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Dynamic Interactive Card Mockup */}
          <div className="hr-showcase__mockup-wrapper">
            <div className="hr-mockup-floating-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>

            <div className="hr-mockup-selector">
              <span className="hr-mockup-selector__label">Select sample employee record:</span>
              <div className="hr-mockup-selector__pills">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    className={`hr-emp-pill ${emp.id === activeEmp.id ? 'hr-emp-pill--active' : ''}`}
                    onClick={() => setSelectedEmpId(emp.id)}
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="hr-mockup-card">
              {/* Employee Top Card */}
              <div className="hr-emp-header">
                <div className="hr-emp-avatar" style={{ backgroundColor: activeEmp.avatarBg || BRAND.primary }}>
                  {activeEmp.initials}
                </div>
                <div className="hr-emp-info">
                  <div className="hr-emp-title-row">
                    <h4 className="hr-emp-name">{activeEmp.name}</h4>
                    <span className="hr-emp-status">Active</span>
                  </div>
                  <p className="hr-emp-role">{activeEmp.title}</p>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="hr-emp-metrics">
                <div className="hr-emp-metric">
                  <span className="hr-emp-metric__label">Department</span>
                  <strong className="hr-emp-metric__val">{activeEmp.department}</strong>
                </div>
                <div className="hr-emp-metric">
                  <span className="hr-emp-metric__label">Leave Balance</span>
                  <strong className="hr-emp-metric__val">{activeEmp.leaveBalance}</strong>
                </div>
                <div className="hr-emp-metric">
                  <span className="hr-emp-metric__label">Tenure</span>
                  <strong className="hr-emp-metric__val">{activeEmp.tenure}</strong>
                </div>
              </div>

              {/* Payroll Summary Section */}
              <div className="hr-payroll-box">
                <div className="hr-payroll-box__head">
                  <h5 className="hr-payroll-box__title">Payroll Summary</h5>
                  <span className="hr-payroll-box__period">{activeEmp.period}</span>
                </div>

                <div className="hr-payroll-box__rows">
                  <div className="hr-payroll-row">
                    <span className="hr-payroll-row__label">Base Salary</span>
                    <strong className="hr-payroll-row__val">{activeEmp.baseSalary}</strong>
                  </div>
                  <div className="hr-payroll-row">
                    <span className="hr-payroll-row__label">Allowances</span>
                    <strong className="hr-payroll-row__val hr-payroll-row__val--pos">{activeEmp.allowances}</strong>
                  </div>
                  <div className="hr-payroll-row">
                    <span className="hr-payroll-row__label">Deductions (RSSB, Tax)</span>
                    <strong className="hr-payroll-row__val hr-payroll-row__val--neg">{activeEmp.deductions}</strong>
                  </div>
                </div>

                <div className="hr-payroll-box__divider" />

                <div className="hr-payroll-box__total">
                  <div>
                    <span className="hr-payroll-total__label">Net Pay</span>
                    <div className="hr-payroll-total__trend">
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3.5 12.5L10 6v3.5h1.5V3.5H8V5h3.5L5 11.5l-1.5 1z" />
                      </svg>
                      {activeEmp.trend}
                    </div>
                  </div>
                  <strong className="hr-payroll-total__val">{activeEmp.netPay}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
