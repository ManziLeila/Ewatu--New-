import { Navigate } from 'react-router-dom';
import { useCapabilities } from '../lib/capabilities';

type RequireModuleProps = {
  moduleId: string;
  children: React.ReactNode;
  fallbackTo?: string;
};

/** Redirect when tenant has not licensed this product module. */
export function RequireModule({
  moduleId,
  children,
  fallbackTo = '/platform',
}: RequireModuleProps) {
  const { hasModule, loading } = useCapabilities();

  if (loading) {
    return (
      <div className="adm-boot">
        <p className="muted">Loading workspace…</p>
      </div>
    );
  }

  if (!hasModule(moduleId)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}
