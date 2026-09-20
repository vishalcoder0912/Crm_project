// hello this is vishal project
import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Icon } from '../components/icons';

const FEATURES = [
  { icon: 'enquiries', title: 'Enquiry to Order', desc: 'Track every lead through measurement, quotation, and WON.' },
  { icon: 'inventory', title: 'Real-time stock', desc: 'Live inventory, stock requests, and purchase order workflows.' },
  { icon: 'tailoring', title: 'Production pipeline', desc: 'Tailoring, QC, packing, and field installation tracking.' },
  { icon: 'payments', title: 'Payments & analytics', desc: 'Advance, installment, and balance tracking with live KPIs.' },
] as const;

function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-brand-500 font-extrabold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      A
    </div>
  );
}

export default function Login() {
  const { session, login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@furnishops.com');
  const [password, setPassword] = useState('Admin@123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Is the backend running on port 3000?');
    } finally {
      setBusy(false);
    }
  };

  const enterDemo = () => {
    loginDemo();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-lg font-bold uppercase tracking-wide">Aradhana</p>
            <p className="text-xs text-white/60">Furnishing CRM</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-snug">
            Run your curtain &amp; blind business end-to-end, from enquiry to installation.
          </h1>
          <div className="mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <Icon name={f.icon} size={16} />
                </div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Aradhana Furnishing. Curtains · Blinds · Customised Furnishing</p>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
            <p className="mt-3 text-xl font-bold uppercase tracking-wide text-ink">Aradhana</p>
            <p className="text-xs text-muted">Furnishing CRM</p>
          </div>
          <h2 className="text-[26px] font-bold tracking-tight text-ink">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Sign in to your workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-2">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@furnishops.com" autoComplete="username" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-2">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && (
              <div className="fade-in rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full py-2.5">
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <Icon name="send" size={15} />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="secondary" onClick={enterDemo} className="w-full py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 1-10 10h10z" /><path d="M12 12 4.9 4.9" />
            </svg>
            Explore with demo data
          </Button>

          <p className="mt-8 text-center text-xs text-muted">
            Default logins — Admin: <span className="font-medium text-ink-2">admin@furnishops.com / Admin@123</span><br />
            Sales: <span className="font-medium text-ink-2">sales@furnishops.com / Sales@123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
