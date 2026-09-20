// hello this is vishal project
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './icons';
import { Avatar, Badge, IconButton } from './ui';
import { CommandPalette } from './CommandPalette';
import { data } from '../lib/data';

type NavItem = { to: string; label: string; icon: string; sub?: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/reports', label: 'Reports', icon: 'chart' },
      { to: '/follow-ups', label: 'Follow-ups', icon: 'bell' },
    ],
  },
  {
    group: 'CRM',
    items: [
      { to: '/customers', label: 'Customers', icon: 'customers' },
      { to: '/enquiries', label: 'Enquiries', icon: 'enquiries' },
      { to: '/communications', label: 'Communications', icon: 'send' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { to: '/quotations', label: 'Quotations', icon: 'quotations' },
      { to: '/orders', label: 'Orders', icon: 'orders' },
      { to: '/payments', label: 'Payments', icon: 'payments' },
    ],
  },
  {
    group: 'Catalog & Stock',
    items: [
      { to: '/products', label: 'Products & SKUs', icon: 'products' },
      { to: '/inventory', label: 'Inventory', icon: 'inventory' },
      { to: '/stock-requests', label: 'Stock Requests', icon: 'stockrequests' },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: 'purchaseorders' },
      { to: '/goods-receipts', label: 'Goods Receipts', icon: 'goodsreceipts' },
    ],
  },
  {
    group: 'Production & Field',
    items: [
      { to: '/tailoring', label: 'Tailoring', icon: 'tailoring' },
      { to: '/qc', label: 'Quality Control', icon: 'qc' },
      { to: '/packing', label: 'Packing', icon: 'packing' },
      { to: '/installations', label: 'Installations', icon: 'installations' },
      { to: '/resizing', label: 'Resizing & Rework', icon: 'resizing' },
      { to: '/field-employees', label: 'Field Employees', icon: 'customers' },
      { to: '/vehicles', label: 'Vehicles & Trips', icon: 'truck' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/branches', label: 'Branches', icon: 'building', sub: 'Organization' },
      { to: '/users', label: 'Users & Roles', icon: 'users', sub: 'Access Control' },
      { to: '/permissions', label: 'Permissions', icon: 'shield' },
      { to: '/notifications', label: 'Notifications', icon: 'bell', sub: 'Communication' },
      { to: '/communication-settings', label: 'Communication Settings', icon: 'message' },
      { to: '/audit-logs', label: 'Audit Logs', icon: 'fileText', sub: 'Governance' },
      { to: '/activity-logs', label: 'Activity Logs', icon: 'history' },
      { to: '/document-settings', label: 'Document Settings', icon: 'quotations', sub: 'Documents' },
      { to: '/integration-settings', label: 'Integration Settings', icon: 'plug', sub: 'Integrations' },
      { to: '/system-settings', label: 'System Settings', icon: 'settings', sub: 'System' },
    ],
  },
];

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reports': 'Reports & Analytics',
  '/follow-ups': 'Follow-ups',
  '/customers': 'Customers',
  '/enquiries': 'Enquiries',
  '/communications': 'Communications',
  '/quotations': 'Quotations',
  '/orders': 'Orders',
  '/payments': 'Payments',
  '/products': 'Products & SKUs',
  '/inventory': 'Inventory',
  '/stock-requests': 'Stock Requests',
  '/purchase-orders': 'Purchase Orders',
  '/goods-receipts': 'Goods Receipts',
  '/tailoring': 'Tailoring Orders',
  '/qc': 'Quality Control',
  '/packing': 'Packing',
  '/installations': 'Installations',
  '/resizing': 'Resizing & Rework',
  '/field-employees': 'Field Employees',
  '/vehicles': 'Vehicles & Trips',
  '/branches': 'Branches',
  '/users': 'Users & Roles',
  '/permissions': 'Permissions',
  '/notifications': 'Notifications',
  '/audit-logs': 'Audit Logs',
  '/activity-logs': 'Activity Logs',
  '/document-settings': 'Document Settings',
  '/communication-settings': 'Communication Settings',
  '/integration-settings': 'Integration Settings',
  '/system-settings': 'System Settings',
};

const QUICK_CREATE: { label: string; to: string; icon: string }[] = [
  { label: 'New Customer', to: '/customers', icon: 'customers' },
  { label: 'New Enquiry', to: '/enquiries', icon: 'enquiries' },
  { label: 'Schedule Measurement', to: '/enquiries', icon: 'calendar' },
  { label: 'Create Quotation', to: '/quotations', icon: 'quotations' },
  { label: 'Create Follow-up', to: '/follow-ups', icon: 'bell' },
];

function roleLabel(roleName?: string) {
  if (!roleName) return 'Team member';
  return roleName === 'Admin' ? 'Administrator' : roleName;
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    data.list('/notifications').then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  const unread = items.filter((n) => !n.isRead).length;
  return (
    <div className="relative">
      <IconButton title="Notifications" onClick={() => setOpen((o) => !o)} className="relative">
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-ink ring-2 ring-surface">
            {unread}
          </span>
        )}
      </IconButton>
      {open && (
        <div
          className="pop-in absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            <span className="text-[11px] font-medium text-muted">{unread} unread</span>
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No notifications</p>}
            {items.map((n) => (
              <div key={n.id} className={`flex gap-3 border-b border-line-soft px-4 py-3 ${n.isRead ? '' : 'bg-brand-50'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-slate-300' : 'bg-brand-500'}`} />
                <div>
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickCreate({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-[13px] font-semibold text-ink transition hover:bg-brand-400"
      >
        <Icon name="plus" size={16} />
        {!collapsed && <span className="hidden sm:inline">Create</span>}
      </button>
      {open && (
        <div
          className="pop-in absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
          onClick={(e) => e.stopPropagation()}
        >
          {QUICK_CREATE.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                navigate(item.to);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-ink-2 transition hover:bg-brand-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-line-soft text-muted">
                <Icon name={item.icon} size={15} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  if (!user) return null;

  const go = (tab: string) => {
    setOpen(false);
    navigate(`/system-settings?tab=${tab}`);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={collapsed ? `${user.firstName} ${user.lastName}` : undefined}
        className={`flex w-full items-center rounded-lg py-2 transition hover:bg-hover ${collapsed ? 'justify-center px-0' : 'gap-3 px-2.5'}`}
      >
        <Avatar name={`${user.firstName} ${user.lastName}`} size={34} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-[13px] font-semibold text-ink">
                {user.firstName} {user.lastName}
              </span>
              <span className="block truncate text-[11px] text-muted">{roleLabel(user.roleName)}</span>
            </span>
            <Icon name="more" size={16} className="shrink-0 text-muted" />
          </>
        )}
      </button>
      {open && (
        <div
          className={`pop-in absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)] ${collapsed ? 'w-56' : 'w-full min-w-[232px]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={`${user.firstName} ${user.lastName}`} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <button onClick={() => go('general')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-line-soft">
              <Icon name="customers" size={16} /> Profile
            </button>
            <button onClick={() => go('general')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-line-soft">
              <Icon name="settings" size={16} /> Account Settings
            </button>
            <button onClick={() => go('security')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-line-soft">
              <Icon name="shield" size={16} /> Security
            </button>
            <div className="my-1 border-t border-line-soft" />
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
            >
              <Icon name="logout" size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);
  if (!user) return null;
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-line-soft"
      >
        <Avatar name={`${user.firstName} ${user.lastName}`} size={32} />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-xs font-semibold text-ink">{user.firstName} {user.lastName}</span>
          <span className="block text-[10px] text-muted">{roleLabel(user.roleName)}</span>
        </span>
        <Icon name="chevron" size={14} className="hidden text-muted xl:block" />
      </button>
      {open && (
        <div
          className="pop-in absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={`${user.firstName} ${user.lastName}`} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => navigate('/system-settings?tab=general')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-line-soft"
            >
              <Icon name="settings" size={16} /> Account Settings
            </button>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
            >
              <Icon name="logout" size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { session, demo } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('fops_sidebar') === 'collapsed');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('fops_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!session) return <Navigate to="/login" replace />;

  const base = '/' + location.pathname.split('/')[1];
  const title = TITLES[base] ?? 'Furnishing CRM';
  const section = NAV.find((g) => g.items.some((i) => i.to === base))?.group ?? 'Workspace';

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-line bg-surface transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'w-[72px]' : 'w-[248px]'
        } ${sidebarOpen ? 'translate-x-0 slide-in-left' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand */}
        <div className={`flex h-[72px] shrink-0 items-center border-b border-line ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-[17px] font-extrabold text-ink">
            A
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-tight text-ink">Aradhana</p>
              <p className="truncate text-[11px] leading-tight text-muted">Furnishing CRM</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="ml-auto hidden shrink-0 rounded-md p-1.5 text-muted transition hover:bg-line-soft hover:text-ink lg:block"
            >
              <Icon name="chevronLeft" size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="scroll-slim flex-1 overflow-y-auto px-3 py-3">
          {NAV.map((g, gi) => (
            <div key={g.group} className={gi > 0 ? 'mt-5' : ''}>
              {!collapsed ? (
                <p className="mb-1.5 px-3.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{g.group}</p>
              ) : (
                gi > 0 && <div className="mx-2 my-2 border-t border-line-soft" />
              )}
              <div className="space-y-0.5">
                {g.items.map((it, ii) => (
                  <div key={it.to}>
                    {!collapsed && it.sub && (
                      <p className={`px-3.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 ${ii === 0 ? 'pt-1' : 'pt-3'}`}>
                        {it.sub}
                      </p>
                    )}
                    <NavLink
                      to={it.to}
                      title={collapsed ? it.label : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `relative flex h-10 items-center rounded-lg text-[13.5px] font-medium transition duration-150 ${
                          collapsed ? 'justify-center px-0' : 'gap-3 px-3.5'
                        } ${isActive ? 'bg-selected font-semibold text-ink' : 'text-ink-2/80 hover:bg-hover hover:text-ink'}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
                          )}
                          <span className="flex w-5 shrink-0 items-center justify-center">
                            <Icon name={it.icon} size={18} />
                          </span>
                          {!collapsed && <span className="truncate">{it.label}</span>}
                        </>
                      )}
                    </NavLink>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-line p-3">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="mb-2 hidden w-full items-center justify-center rounded-lg py-2 text-muted transition hover:bg-line-soft hover:text-ink lg:flex"
            >
              <Icon name="chevronRight" size={16} />
            </button>
          ) : null}
          <ProfileMenu collapsed={collapsed} />
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[66px] shrink-0 items-center gap-3 border-b border-line bg-surface px-5 lg:px-7 xl:px-8">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-muted hover:bg-line-soft lg:hidden">
            <Icon name="menu" />
          </button>
          <div className="min-w-0">
            <nav className="flex items-center gap-1 text-[11px] leading-tight text-muted">
              <span className="hidden sm:inline">Aradhana Furnishing</span>
              <Icon name="chevronRight" size={11} className="hidden sm:inline" />
              <span className="truncate">{section}</span>
            </nav>
            <h2 className="truncate text-[15px] font-semibold leading-tight text-ink">{title}</h2>
          </div>
          {demo && <Badge tone="brand">Demo data</Badge>}

          <div className="hidden flex-1 justify-center px-4 md:flex">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 w-full max-w-lg items-center gap-2.5 rounded-lg border border-line bg-canvas px-3 text-left text-[13px] text-muted transition hover:border-brand-300 hover:bg-white"
            >
              <Icon name="search" size={16} />
              <span className="flex-1 truncate">Search customers, enquiries, orders…</span>
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold text-muted">Ctrl K</kbd>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <IconButton title="Search" onClick={() => setPaletteOpen(true)} className="md:hidden">
              <Icon name="search" />
            </IconButton>
            <QuickCreate />
            <NotificationsBell />
            <TopProfileMenu />
          </div>
        </header>

        <main className="w-full max-w-none flex-1 px-5 py-6 pb-10 lg:px-7 xl:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
