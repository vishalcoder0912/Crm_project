// hello this is vishal project
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, PageHeader, Select, StatusBadge } from '../components/ui';
import { Icon } from '../components/icons';
import { data } from '../lib/data';

interface CalendarEvent {
  id: string | number;
  type: 'MEASUREMENT_SCHEDULE' | 'INSTALLATION' | 'PAYMENT' | 'ENQUIRY' | 'FOLLOW_UP' | 'followup' | 'measurement' | 'installation' | 'payment' | 'enquiry';
  businessId?: string;
  title: string;
  sub: string;
  date: string;
  time?: string | null;
  status: string;
  assignee?: string | null;
  branch?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  route?: string;
}

interface CalendarResponse {
  from: string | null;
  to: string | null;
  query: any;
  total: number;
  events: CalendarEvent[];
}

const TYPE_ORDER = ['MEASUREMENT_SCHEDULE', 'FOLLOW_UP', 'INSTALLATION', 'ENQUIRY', 'PAYMENT'] as const;

const normalizeType = (t: string): typeof TYPE_ORDER[number] => {
  const u = t.toUpperCase();
  if (u.includes('MEASURE')) return 'MEASUREMENT_SCHEDULE';
  if (u.includes('FOLLOW')) return 'FOLLOW_UP';
  if (u.includes('INSTALL')) return 'INSTALLATION';
  if (u.includes('ENQUIR')) return 'ENQUIRY';
  if (u.includes('PAY')) return 'PAYMENT';
  return 'FOLLOW_UP';
};

const TYPE_META: Record<string, { label: string; icon: string; chip: string; dot: string }> = {
  MEASUREMENT_SCHEDULE: { label: 'Measurement', icon: 'grid', chip: 'bg-teal-50 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
  FOLLOW_UP: { label: 'Follow-up', icon: 'bell', chip: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-400' },
  INSTALLATION: { label: 'Installation', icon: 'installations', chip: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' },
  ENQUIRY: { label: 'Enquiry', icon: 'enquiries', chip: 'bg-violet-50 text-violet-800 border-violet-200', dot: 'bg-violet-400' },
  PAYMENT: { label: 'Payment', icon: 'payments', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [type, setType] = useState<string>('all');
  const [branch, setBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  const from = new Date(cursor.y, cursor.m, 1);
  const to = new Date(cursor.y, cursor.m + 1, 0);
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  // Quick schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    customerName: '',
    phone: '',
    siteAddress: '',
    scheduledDate: '',
    scheduledTime: '11:00 AM',
    notes: '',
  });
  const [scheduleBusy, setScheduleBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      type: type === 'all' ? '' : type,
      q: searchQuery.trim(),
    });
    data
      .one<CalendarResponse>(`/calendar/events?${params}`)
      .then((r) => setEvents((r && Array.isArray(r.events) ? (r as CalendarResponse) : { events: [] as CalendarEvent[] }).events))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));

    if (selectedDay > to.getDate()) setSelectedDay(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, type, searchQuery]);

  // Client-side branch filter if selected
  const filteredEvents = useMemo(() => {
    if (branch === 'all') return events;
    return events.filter((e) => (e.branch ?? '').toLowerCase().includes(branch.toLowerCase()));
  }, [events, branch]);

  const byDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filteredEvents) {
      const k = dayKey(e.date);
      (map[k] ??= []).push(e);
    }
    return map;
  }, [filteredEvents]);

  const offset = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = to.getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = byDay[`${cursor.y}-${cursor.m}-${selectedDay}`] ?? [];

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const goToday = () => {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelectedDay(d.getDate());
  };

  const isToday = (day: number) =>
    today.getFullYear() === cursor.y && today.getMonth() === cursor.m && today.getDate() === day;

  const handleCreateSchedule = async () => {
    if (!scheduleData.customerName.trim() || !scheduleData.phone.trim()) {
      window.alert('Customer name and phone are required');
      return;
    }
    setScheduleBusy(true);
    try {
      // 1. Create or resolve customer
      const cust = await data.post('/customers', {
        name: scheduleData.customerName.trim(),
        phone: scheduleData.phone.trim(),
        address: scheduleData.siteAddress.trim() || undefined,
        notes: scheduleData.notes || 'Scheduled from calendar',
      });

      // 2. Schedule measurement visit
      await data.post('/measurements/schedule-visit', {
        customerId: cust.id,
        scheduledDate: scheduleData.scheduledDate,
        scheduledTime: scheduleData.scheduledTime,
        siteAddress: scheduleData.siteAddress,
        phone: scheduleData.phone,
        customerName: scheduleData.customerName,
        notes: scheduleData.notes,
      });

      setShowScheduleModal(false);
      setScheduleData({ customerName: '', phone: '', siteAddress: '', scheduledDate: '', scheduledTime: '11:00 AM', notes: '' });
      // Reload calendar
      move(0);
    } catch (e: any) {
      window.alert(e?.message ?? 'Could not schedule measurement');
    } finally {
      setScheduleBusy(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      {/* Store Header Banner */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-50/50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 font-bold text-white text-xs">
                AF
              </span>
              <h1 className="text-base font-bold text-slate-900">
                Aradhana Furnishing · Business Activity &amp; Appointment Calendar
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted">
              Doorstep measurements, installations, follow-ups, and customer consultations across Ghaziabad, Meerut &amp; Dehradun
            </p>
          </div>
          <Button
            onClick={() => {
              const d = new Date(cursor.y, cursor.m, selectedDay);
              setScheduleData({
                customerName: '',
                phone: '',
                siteAddress: '',
                scheduledDate: d.toISOString().slice(0, 10),
                scheduledTime: '11:00 AM',
                notes: '',
              });
              setShowScheduleModal(true);
            }}
          >
            <Icon name="plus" size={15} /> Schedule Measurement Visit
          </Button>
        </div>
      </div>

      <PageHeader
        title="Calendar & Operations Schedule"
        subtitle={`${filteredEvents.length} scheduled business activities in ${from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
      />

      {/* Controls & Omni-Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface p-3">
        {/* Month controls */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => move(-1)}><Icon name="chevronLeft" size={15} /></Button>
          <h2 className="min-w-[160px] text-center text-sm font-bold capitalize text-ink">
            {from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="secondary" onClick={() => move(1)}><Icon name="chevronRight" size={15} /></Button>
          <Button variant="ghost" onClick={goToday}>Today</Button>
        </div>

        {/* Multi-Criteria Filters: Name / Phone search, Store branch, Event type */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-56">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or phone…"
            />
          </div>

          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-40">
            <option value="all">All Stores</option>
            <option value="Ghaziabad">Ghaziabad (RDC Raj Nagar)</option>
            <option value="Meerut">Meerut (Abulane)</option>
            <option value="Dehradun">Dehradun (Race Course)</option>
          </Select>

          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44">
            <option value="all">All Activity Types</option>
            <option value="MEASUREMENT_SCHEDULE">Measurements</option>
            <option value="FOLLOW_UP">Follow-ups</option>
            <option value="INSTALLATION">Installations &amp; Fitting</option>
            <option value="ENQUIRY">Enquiries</option>
            <option value="PAYMENT">Payments</option>
          </Select>
        </div>
      </div>

      {/* Main Calendar View */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Month Grid */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-7 gap-1 pb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted">{w}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex h-80 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-500" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`sp-${i}`} className="min-h-[96px] rounded-lg border border-transparent" />;
                const k = `${cursor.y}-${cursor.m}-${day}`;
                const dayEvents = byDay[k] ?? [];
                const selected = selectedDay === day;
                const isT = isToday(day);
                return (
                  <button
                    key={k}
                    onClick={() => setSelectedDay(day)}
                    className={`group min-h-[96px] rounded-lg border p-1.5 text-left transition ${
                      selected
                        ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-200'
                        : isT
                        ? 'border-brand-200 bg-brand-50/40'
                        : 'border-line-soft bg-white hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-semibold ${isT ? 'bg-teal-700 text-white' : 'text-ink'}`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="rounded bg-teal-100 px-1 py-0.2 font-mono text-[10px] font-bold text-teal-800">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((e) => {
                        const norm = normalizeType(e.type);
                        const meta = TYPE_META[norm] ?? TYPE_META.FOLLOW_UP;
                        return (
                          <div key={e.id} className="flex items-center gap-1 truncate text-[10.5px]">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                            <span className="truncate text-ink-2 font-medium">{e.customerName || e.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] font-bold text-teal-800">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Agenda & Selected Date Detail */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-2 border-b border-line-soft pb-3">
              <div>
                <p className="text-sm font-bold text-ink">
                  {new Date(cursor.y, cursor.m, selectedDay).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <span className="text-[11px] text-muted">
                  {selectedEvents.length} activity item(s) scheduled
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  const d = new Date(cursor.y, cursor.m, selectedDay);
                  setScheduleData({
                    customerName: '',
                    phone: '',
                    siteAddress: '',
                    scheduledDate: d.toISOString().slice(0, 10),
                    scheduledTime: '11:00 AM',
                    notes: '',
                  });
                  setShowScheduleModal(true);
                }}
              >
                <Icon name="plus" size={13} /> Add
              </Button>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[520px] overflow-y-auto scroll-slim pr-1">
              {selectedEvents.length === 0 && (
                <div className="rounded-xl border border-dashed border-line py-10 text-center">
                  <Icon name="calendar" size={24} className="mx-auto text-muted" />
                  <p className="mt-2 text-[12.5px] text-muted font-medium">No business activity on this date</p>
                  <button
                    onClick={() => {
                      const d = new Date(cursor.y, cursor.m, selectedDay);
                      setScheduleData({
                        customerName: '',
                        phone: '',
                        siteAddress: '',
                        scheduledDate: d.toISOString().slice(0, 10),
                        scheduledTime: '11:00 AM',
                        notes: '',
                      });
                      setShowScheduleModal(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
                  >
                    + Schedule doorstep measurement visit
                  </button>
                </div>
              )}

              {selectedEvents.map((e) => {
                const norm = normalizeType(e.type);
                const meta = TYPE_META[norm] ?? TYPE_META.FOLLOW_UP;
                const time = e.time || '11:00 AM';

                return (
                  <div
                    key={e.id}
                    className="rounded-xl border border-line-soft bg-white p-3 transition hover:border-teal-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.chip}`}>
                          <Icon name={meta.icon} size={14} />
                        </span>
                        <div>
                          <p className="text-[13px] font-bold text-ink leading-tight">{e.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted">{e.sub}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-slate-700">
                        {time}
                      </span>
                    </div>

                    {/* Customer Contact & Quick Actions */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft/60 pt-2">
                      <div className="flex items-center gap-2 text-xs">
                        {e.customerPhone ? (
                          <span className="font-mono font-semibold text-slate-700">📞 {e.customerPhone}</span>
                        ) : null}
                        {e.branch && <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[10px] font-semibold text-teal-800">{e.branch}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {e.customerPhone && (
                          <a
                            href={`https://wa.me/91${e.customerPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                            title="Open WhatsApp chat with client"
                          >
                            WhatsApp
                          </a>
                        )}
                        {e.route && (
                          <button
                            onClick={() => navigate(e.route ?? '#')}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Open →
                          </button>
                        )}
                        <StatusBadge status={e.status} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Schedule Doorstep Measurement Visit Modal */}
      {showScheduleModal && (
        <Modal open onClose={() => setShowScheduleModal(false)} title="Schedule Doorstep Measurement Visit">
          <div className="space-y-4">
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-900">
              <p className="font-semibold">Aradhana Furnishing Doorstep Measurement</p>
              <p className="mt-0.5 text-teal-700">Technician will visit client site with fabric and wallpaper catalogs for Ghaziabad, Meerut &amp; Dehradun stores.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Customer Name *</label>
                <Input
                  value={scheduleData.customerName}
                  onChange={(e) => setScheduleData({ ...scheduleData, customerName: e.target.value })}
                  placeholder="e.g. Rohit Verma"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Customer Mobile Number *</label>
                <Input
                  value={scheduleData.phone}
                  onChange={(e) => setScheduleData({ ...scheduleData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Scheduled Date *</label>
                <Input
                  type="date"
                  value={scheduleData.scheduledDate}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Time Slot</label>
                <Select
                  value={scheduleData.scheduledTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, scheduledTime: e.target.value })}
                >
                  <option value="10:00 AM">10:00 AM - 11:30 AM</option>
                  <option value="11:30 AM">11:30 AM - 01:00 PM</option>
                  <option value="02:00 PM">02:00 PM - 03:30 PM</option>
                  <option value="04:00 PM">04:00 PM - 05:30 PM</option>
                  <option value="06:00 PM">06:00 PM - 07:30 PM</option>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-2">Site / Customer Address</label>
                <Input
                  value={scheduleData.siteAddress}
                  onChange={(e) => setScheduleData({ ...scheduleData, siteAddress: e.target.value })}
                  placeholder="e.g. C-19 RDC Raj Nagar, Ghaziabad"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-2">Requirement Notes</label>
                <Input
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  placeholder="e.g. Curtains for Living Room & Blinds for Bedroom"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
              <Button onClick={handleCreateSchedule} disabled={scheduleBusy}>
                {scheduleBusy ? 'Scheduling…' : 'Confirm & Schedule on Calendar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}