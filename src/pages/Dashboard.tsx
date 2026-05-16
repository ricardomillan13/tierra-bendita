import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, TrendingUp, TrendingDown, ShoppingBag, DollarSign,
  Users, Clock, Store, MapPin, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalMetrics, useFieldMetrics, useHourlyMetrics, useDailySeries, DateRange } from '@/hooks/useDashboard';

// ── Design tokens (Tierra Bendita) ───────────────────────────────────────────
const ESPRESSO = '#0f0602';
const DARK     = '#1a0a02';
const SURFACE  = '#231008';
const GOLD     = '#c9a84c';
const GOLD_DIM = 'rgba(201,168,76,0.5)';
const GOLD_BG  = 'rgba(201,168,76,0.08)';
const GOLD_BG2 = 'rgba(201,168,76,0.15)';
const TEXT     = 'rgba(255,255,255,0.88)';
const TEXT_DIM = 'rgba(255,255,255,0.45)';
const TEXT_MUTE= 'rgba(255,255,255,0.22)';
const BORDER   = 'rgba(201,168,76,0.1)';
const BORDER2  = 'rgba(201,168,76,0.2)';
const GREEN    = '#4ade80';
const GREEN_BG = 'rgba(74,222,128,0.1)';
const RED      = '#f87171';
const RED_BG   = 'rgba(248,113,113,0.1)';
const BLUE     = '#60a5fa';
const BLUE_BG  = 'rgba(96,165,250,0.1)';
const PURPLE   = '#c084fc';
const PURPLE_BG= 'rgba(192,132,252,0.1)';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hoy', week: '7 días', month: '30 días', all: 'Todo',
};

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
    </div>
  );
}

// ── Daily chart ───────────────────────────────────────────────────────────────
function DailyChart({ data }: { data: { label: string; local: number; field: number }[] }) {
  if (!data.length) return (
    <p style={{ color: TEXT_MUTE, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin datos</p>
  );

  const maxVal = Math.max(...data.map(d => d.local + d.field), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, overflowX: 'auto',
                  paddingBottom: 24, position: 'relative' }}>
      {data.map((d, i) => {
        const localH = (d.local / maxVal) * 80;
        const fieldH = (d.field / maxVal) * 80;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                                gap: 2, flexShrink: 0, minWidth: 36 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
              <div style={{ width: 10, height: Math.max(2, localH), background: GOLD,
                            borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              <div style={{ width: 10, height: Math.max(2, fieldH), background: GREEN,
                            borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
            </div>
            <span style={{ color: TEXT_MUTE, fontSize: 9, whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: GOLD }} />
          <span style={{ color: TEXT_MUTE, fontSize: 10 }}>Local</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: GREEN }} />
          <span style={{ color: TEXT_MUTE, fontSize: 10 }}>Campo</span>
        </div>
      </div>
    </div>
  );
}

// ── Hourly chart ──────────────────────────────────────────────────────────────
function HourlyChart({ data }: { data: { label: string; orders: number; total: number }[] }) {
  const active = data.filter(d => d.orders > 0);
  if (!active.length) return (
    <p style={{ color: TEXT_MUTE, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin datos</p>
  );

  const maxOrders = Math.max(...data.map(d => d.orders), 1);
  const peak = data.reduce((p, c) => c.orders > p.orders ? c : p, data[0]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, overflowX: 'auto',
                    paddingBottom: 20 }}>
        {data.map((d, i) => {
          const h = (d.orders / maxOrders) * 70;
          const isPeak = d.label === peak.label && d.orders > 0;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                                  gap: 2, flexShrink: 0, minWidth: 20 }}>
              <div style={{ width: 14, height: Math.max(2, h),
                            background: isPeak ? GOLD : 'rgba(201,168,76,0.3)',
                            borderRadius: '3px 3px 0 0' }} />
              {i % 3 === 0 && (
                <span style={{ color: TEXT_MUTE, fontSize: 8 }}>{d.label.slice(0,2)}</span>
              )}
            </div>
          );
        })}
      </div>
      {peak.orders > 0 && (
        <p style={{ color: TEXT_DIM, fontSize: 12, marginTop: 4 }}>
          🔥 Hora pico: <span style={{ color: GOLD, fontWeight: 700 }}>{peak.label}</span>
          {' · '}{peak.orders} órden{peak.orders > 1 ? 'es' : ''}
        </p>
      )}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: SURFACE,
                  border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTE, textTransform: 'uppercase',
                       letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32,
                    fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: TEXT_MUTE }}>{sub}</div>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, icon, children, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{ background: DARK, border: `1px solid ${accent ? BORDER2 : BORDER}`,
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: accent ? `0 0 0 1px ${accent}11` : 'none' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: accent ? `${accent}08` : 'transparent' }}>
        <div style={{ color: accent ?? GOLD_DIM }}>{icon}</div>
        <span style={{ color: accent ?? GOLD, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// ── Product ranking ───────────────────────────────────────────────────────────
function ProductRanking({ items, color }: {
  items: { name: string; qty: number; total: number }[];
  color: string;
}) {
  if (!items.length) return <p style={{ color: TEXT_MUTE, fontSize: 13 }}>Sin datos</p>;
  const max = Math.max(...items.map(i => i.qty));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={item.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: TEXT_MUTE, fontSize: 10, fontWeight: 700, width: 14 }}>#{i+1}</span>
              <span style={{ color: TEXT, fontSize: 13, fontWeight: 500 }}>{item.name}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color, fontSize: 13, fontWeight: 700 }}>{item.qty} pzas</span>
              <span style={{ color: TEXT_MUTE, fontSize: 11, marginLeft: 6 }}>
                ${item.total.toFixed(0)}
              </span>
            </div>
          </div>
          <MiniBar value={item.qty} max={max} color={color} />
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [range, setRange] = useState<DateRange>('today');

  const { data: local,  isLoading: localLoading,  refetch: refetchLocal  } = useLocalMetrics(range);
  const { data: field,  isLoading: fieldLoading,  refetch: refetchField  } = useFieldMetrics(range);
  const { data: hourly, isLoading: hourlyLoading                          } = useHourlyMetrics(range);
  const { data: daily,  isLoading: dailyLoading                           } = useDailySeries(range);

  const isDataLoading = localLoading || fieldLoading || hourlyLoading || dailyLoading;

  // Auth guard
  if (!loading && (!user || !isAdmin)) {
    navigate('/auth');
    return null;
  }

  const totalSales  = (local?.totalSales  ?? 0) + (field?.totalSales  ?? 0);
  const totalOrders = (local?.totalOrders ?? 0) + (field?.totalOrders ?? 0);

  return (
    <div style={{ minHeight: '100dvh', background: ESPRESSO, fontFamily: "'Barlow',sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Glow */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 300, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)' }} />

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: `${DARK}f0`,
                       backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}`,
                       padding: '14px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/pos')} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_DIM,
              borderRadius: 10, padding: '7px 12px', fontSize: 13, cursor: 'pointer',
            }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> POS
            </button>
            <div>
              <div style={{ color: GOLD_DIM, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                Tierra Bendita
              </div>
              <div style={{ color: TEXT, fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
                Dashboard de Ventas
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Range selector */}
            {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: range === r ? GOLD : SURFACE,
                color: range === r ? DARK : TEXT_DIM,
                border: `1px solid ${range === r ? GOLD : BORDER}`,
              }}>
                {RANGE_LABELS[r]}
              </button>
            ))}
            <button onClick={() => { refetchLocal(); refetchField(); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 10,
              background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_DIM, cursor: 'pointer',
            }}>
              <RefreshCw style={{ width: 14, height: 14,
                animation: isDataLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ── GLOBAL KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12, marginBottom: 24 }}>
          <KPI label="Ventas totales" value={`$${totalSales.toFixed(2)}`}
               sub="Ambos canales" color={GOLD}
               icon={<DollarSign style={{ width: 15, height: 15 }} />} />
          <KPI label="Órdenes totales" value={String(totalOrders)}
               sub={`${local?.totalOrders ?? 0} local · ${field?.totalOrders ?? 0} campo`}
               color={BLUE} icon={<ShoppingBag style={{ width: 15, height: 15 }} />} />
          <KPI label="Ticket promedio" value={totalOrders > 0 ? `$${(totalSales / totalOrders).toFixed(2)}` : '$0'}
               sub="Por orden" color={PURPLE}
               icon={<TrendingUp style={{ width: 15, height: 15 }} />} />
          <KPI label="Vendedores activos" value={String(field?.sellers?.length ?? 0)}
               sub="En campo" color={GREEN}
               icon={<Users style={{ width: 15, height: 15 }} />} />
        </div>

        {/* ── COMPARATIVA LOCAL vs CAMPO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {/* Local */}
          <div style={{ background: DARK, border: `1px solid ${BORDER2}`, borderRadius: 20,
                        padding: 16, boxShadow: `0 0 0 1px ${GOLD}11` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Store style={{ width: 16, height: 16, color: GOLD }} />
              <span style={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>Local</span>
            </div>
            {localLoading
              ? <Loader2 style={{ width: 20, height: 20, color: GOLD, animation: 'spin 1s linear infinite' }} />
              : <>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36,
                                fontWeight: 900, color: GOLD, lineHeight: 1 }}>
                    ${(local?.totalSales ?? 0).toFixed(2)}
                  </div>
                  <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 4 }}>
                    {local?.totalOrders ?? 0} órdenes · $
                    {(local?.avgTicket ?? 0).toFixed(2)} prom.
                  </div>
                </>
            }
          </div>

          {/* Campo */}
          <div style={{ background: DARK, border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20,
                        padding: 16, boxShadow: '0 0 0 1px rgba(74,222,128,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MapPin style={{ width: 16, height: 16, color: GREEN }} />
              <span style={{ color: GREEN, fontSize: 13, fontWeight: 700 }}>Campo</span>
            </div>
            {fieldLoading
              ? <Loader2 style={{ width: 20, height: 20, color: GREEN, animation: 'spin 1s linear infinite' }} />
              : <>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 36,
                                fontWeight: 900, color: GREEN, lineHeight: 1 }}>
                    ${(field?.totalSales ?? 0).toFixed(2)}
                  </div>
                  <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 4 }}>
                    {field?.totalOrders ?? 0} órdenes · $
                    {(field?.avgTicket ?? 0).toFixed(2)} prom.
                  </div>
                </>
            }
          </div>
        </div>

        {/* ── DAILY CHART ── */}
        <div style={{ marginBottom: 24 }}>
          <Card title="Ventas por día" icon={<TrendingUp style={{ width: 15, height: 15 }} />}>
            {dailyLoading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <Loader2 style={{ width: 20, height: 20, color: GOLD, animation: 'spin 1s linear infinite' }} />
                </div>
              : <DailyChart data={daily ?? []} />
            }
          </Card>
        </div>

        {/* ── PRODUCTOS TOP/BOTTOM — LOCAL ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <Card title="Más vendidos · Local" accent={GOLD}
                icon={<TrendingUp style={{ width: 15, height: 15 }} />}>
            {localLoading
              ? <Loader2 style={{ width: 18, height: 18, color: GOLD, animation: 'spin 1s linear infinite' }} />
              : <ProductRanking items={local?.topProducts ?? []} color={GOLD} />
            }
          </Card>
          <Card title="Menos vendidos · Local" accent={RED}
                icon={<TrendingDown style={{ width: 15, height: 15 }} />}>
            {localLoading
              ? <Loader2 style={{ width: 18, height: 18, color: RED, animation: 'spin 1s linear infinite' }} />
              : <ProductRanking items={local?.leastSold ?? []} color={RED} />
            }
          </Card>
        </div>

        {/* ── HORA PICO ── */}
        <div style={{ marginBottom: 24 }}>
          <Card title="Actividad por hora · Local" icon={<Clock style={{ width: 15, height: 15 }} />}>
            {hourlyLoading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <Loader2 style={{ width: 20, height: 20, color: GOLD, animation: 'spin 1s linear infinite' }} />
                </div>
              : <HourlyChart data={hourly ?? []} />
            }
          </Card>
        </div>

        {/* ── VENDEDORES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <Card title="Ranking vendedores" accent={GREEN}
                icon={<Users style={{ width: 15, height: 15 }} />}>
            {fieldLoading
              ? <Loader2 style={{ width: 18, height: 18, color: GREEN, animation: 'spin 1s linear infinite' }} />
              : !field?.sellers?.length
                ? <p style={{ color: TEXT_MUTE, fontSize: 13 }}>Sin ventas en campo</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {field.sellers.map((s, i) => {
                      const max = field.sellers[0].sales;
                      return (
                        <div key={s.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: TEXT_MUTE, fontSize: 10, fontWeight: 700, width: 14 }}>#{i+1}</span>
                              <span style={{ color: TEXT, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ color: GREEN, fontSize: 13, fontWeight: 700 }}>
                                ${s.sales.toFixed(0)}
                              </span>
                              <span style={{ color: TEXT_MUTE, fontSize: 11, marginLeft: 6 }}>
                                {s.orders} ór.
                              </span>
                            </div>
                          </div>
                          <MiniBar value={s.sales} max={max} color={GREEN} />
                        </div>
                      );
                    })}
                  </div>
            }
          </Card>

          <Card title="Más vendidos · Campo" accent={GREEN}
                icon={<TrendingUp style={{ width: 15, height: 15 }} />}>
            {fieldLoading
              ? <Loader2 style={{ width: 18, height: 18, color: GREEN, animation: 'spin 1s linear infinite' }} />
              : <ProductRanking items={field?.topProducts ?? []} color={GREEN} />
            }
          </Card>
        </div>

      </main>
    </div>
  );
}
