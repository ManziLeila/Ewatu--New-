import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  fetchEmployees,
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  type Team,
  type TeamMemberRole,
  type Employee,
} from '../../payrollApi';
import { parseError } from './parseError';

const ROLE_LABEL: Record<TeamMemberRole, string> = { LEAD: 'Lead', CORE: 'Core', MEMBER: 'Member' };

function TeamCard({
  team,
  allTeams,
  employees,
  onChanged,
  depth,
}: {
  team: Team;
  allTeams: Team[];
  employees: Employee[];
  onChanged: () => void;
  depth: number;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addRole, setAddRole] = useState<TeamMemberRole>('MEMBER');
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(team.name);

  const subTeams = allTeams.filter((t) => t.parentTeamId === team.id);
  const memberEmployeeIds = new Set((team.members ?? []).map((m) => m.employeeId));
  const availableEmployees = employees.filter((e) => !memberEmployeeIds.has(e.id));

  const handleAddMember = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!addEmployeeId) return;
    setErr(null);
    try {
      await addTeamMember(team.id, { employeeId: addEmployeeId, role: addRole });
      setShowAdd(false);
      setAddEmployeeId('');
      setAddRole('MEMBER');
      onChanged();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const handleRoleChange = async (employeeId: string, role: TeamMemberRole) => {
    setErr(null);
    try {
      await updateTeamMember(team.id, employeeId, { role });
      onChanged();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    setErr(null);
    try {
      await removeTeamMember(team.id, employeeId);
      onChanged();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const handleRename = async () => {
    if (!name.trim() || name === team.name) {
      setEditingName(false);
      return;
    }
    setErr(null);
    try {
      await updateTeam(team.id, { name: name.trim() });
      setEditingName(false);
      onChanged();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${team.name}"? Sub-teams will be un-nested, not deleted.`)) return;
    setErr(null);
    try {
      await deleteTeam(team.id);
      onChanged();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const leads = (team.members ?? []).filter((m) => m.role === 'LEAD');
  const others = (team.members ?? []).filter((m) => m.role !== 'LEAD');

  return (
    <div className="adm-card" style={{ marginLeft: depth * 24, marginBottom: '1rem', padding: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <button type="button" className="btn small" onClick={handleRename}>Save</button>
              <button type="button" className="btn small" onClick={() => { setEditingName(false); setName(team.name); }}>Cancel</button>
            </div>
          ) : (
            <h3 style={{ margin: '0 0 0.5rem', cursor: 'pointer' }} onClick={() => setEditingName(true)} title="Click to rename">
              {team.name}
            </h3>
          )}
          {leads.length > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginBottom: '0.4rem' }}>
              Lead: {leads.map((m) => `${m.employee?.firstName} ${m.employee?.lastName}`).join(', ')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="btn small" onClick={() => setShowAdd((v) => !v)}>
            + Member
          </button>
          <button type="button" className="btn small" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {err && <div className="alert alert--err" style={{ marginTop: '0.5rem' }}>{err}</div>}

      {showAdd && (
        <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <select className="auth-input" style={{ flex: 1, minWidth: '180px' }} value={addEmployeeId} onChange={(e) => setAddEmployeeId(e.target.value)} required>
            <option value="">Select employee…</option>
            {availableEmployees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.jobTitle ? ` — ${e.jobTitle}` : ''}</option>
            ))}
          </select>
          <select className="auth-input" style={{ width: '120px' }} value={addRole} onChange={(e) => setAddRole(e.target.value as TeamMemberRole)}>
            <option value="LEAD">Lead</option>
            <option value="CORE">Core</option>
            <option value="MEMBER">Member</option>
          </select>
          <button type="submit" className="btn btn--primary small">Add</button>
        </form>
      )}

      {others.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {others.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: '#1e293b', padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.82rem',
              }}
            >
              <span>{m.employee?.firstName} {m.employee?.lastName}</span>
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.employeeId, e.target.value as TeamMemberRole)}
                style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.75rem' }}
              >
                <option value="LEAD">Lead</option>
                <option value="CORE">Core</option>
                <option value="MEMBER">Member</option>
              </select>
              <button
                type="button"
                onClick={() => handleRemoveMember(m.employeeId)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                title="Remove from team"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {leads.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {leads.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'var(--color-primary-soft)', padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.82rem',
              }}
            >
              <span>👑 {m.employee?.firstName} {m.employee?.lastName}</span>
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.employeeId, e.target.value as TeamMemberRole)}
                style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.75rem' }}
              >
                <option value="LEAD">Lead</option>
                <option value="CORE">Core</option>
                <option value="MEMBER">Member</option>
              </select>
              <button
                type="button"
                onClick={() => handleRemoveMember(m.employeeId)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                title="Remove from team"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {(team.members ?? []).length === 0 && (
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>No members yet.</p>
      )}

      {subTeams.map((sub) => (
        <TeamCard key={sub.id} team={sub} allTeams={allTeams} employees={employees} onChanged={onChanged} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState('');

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [t, e] = await Promise.all([fetchTeams(), fetchEmployees()]);
      setTeams(t || []);
      setEmployees(e || []);
    } catch (e) {
      setErr(parseError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(null);
    try {
      await createTeam({ name: newName, parentTeamId: newParentId || undefined });
      setShowCreate(false);
      setNewName('');
      setNewParentId('');
      await load();
    } catch (e) {
      setErr(parseError(e));
    }
  };

  const topLevelTeams = teams.filter((t) => !t.parentTeamId);

  return (
    <div className="adm-page">
      <header className="adm-page__head">
        <h1 className="adm-page__title">Departments / Team Distribution</h1>
        <p className="adm-page__lead">
          Build your company's org structure — departments and their sub-teams, with a lead and
          members for each. People can belong to more than one team. This is what "your team
          leader" resolves to across Performance & KPIs.
        </p>
      </header>

      {err && <div className="alert alert--err">{err}</div>}

      <div className="adm-toolbar">
        <button type="button" className="btn btn--primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Cancel' : '+ New Team'}
        </button>
        <button type="button" className="btn" onClick={() => load()}>
          Refresh
        </button>
      </div>

      {showCreate && (
        <form className="adm-card form" onSubmit={handleCreate} style={{ marginTop: '1rem' }}>
          <label>
            Team / Department name
            <input className="auth-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Talent Acquisition" required />
          </label>
          <label>
            Parent team (optional — for sub-teams like "Finance & Accounting" under "Internal Operations")
            <select className="auth-input" value={newParentId} onChange={(e) => setNewParentId(e.target.value)}>
              <option value="">None — top-level department</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn--primary" style={{ marginTop: '0.5rem' }}>
            Create Team
          </button>
        </form>
      )}

      {loading && <p className="muted" style={{ marginTop: '1rem' }}>Loading org structure…</p>}

      {!loading && topLevelTeams.length === 0 && (
        <div className="adm-card" style={{ marginTop: '1rem', padding: '2rem', textAlign: 'center' }}>
          <p className="muted">No teams yet. Create your first department above.</p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        {topLevelTeams.map((t) => (
          <TeamCard key={t.id} team={t} allTeams={teams} employees={employees} onChanged={load} depth={0} />
        ))}
      </div>
    </div>
  );
}
