import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOrderHistory, useOrderItems } from '@/hooks/useOrders';
import { Order } from '@/types/menu';

// ── Order detail row ──────────────────────────────────────────────────────────
function OrderHistoryRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const { data: items = [] } = useOrderItems(expanded ? order.id : null);

  const statusIcon = order.status === 'completed'
    ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;

  const date = new Date(order.created_at);
  const dateLabel = date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  const timeLabel = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">#{order.order_number}</span>
            {order.customer_name && (
              <span className="text-sm text-muted-foreground truncate">{order.customer_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{order.customer_whatsapp}</span>
            {order.notes && (
              <span className="text-xs text-muted-foreground/60 truncate">· {order.notes}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-sm text-primary">${order.total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{dateLabel} {timeLabel}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-border/60 bg-secondary/20 px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Cargando...</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  <span className="text-muted-foreground mr-1.5">{item.quantity}×</span>
                  {item.product_name}
                </span>
                <span className="text-muted-foreground">${item.subtotal.toFixed(2)}</span>
              </div>
            ))
          )}
          <div className="border-t border-border/40 pt-2 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function OrderHistory() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: orders = [], isLoading } = useOrderHistory({ search, status, dateFrom, dateTo });

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, WhatsApp o #pedido"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as typeof status)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
        >
          <option value="all">Todos</option>
          <option value="completed">Completados</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="w-40"
          placeholder="Desde"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="w-40"
          placeholder="Hasta"
        />
      </div>

      {/* Summary */}
      {orders.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-secondary/50">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{orders.length} pedidos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-sm font-semibold text-success">${totalRevenue.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">en ventas</span>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay pedidos en el historial</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <OrderHistoryRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}