import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Trash2, CheckCircle, Package, AlertCircle,
  WifiOff, Wifi, RefreshCw, Clock, QrCode, X,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '@/hooks/useAuth';
import { useMySellerProfile, useMyInventory } from '@/hooks/useSellers';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const ESPRESSO  = '#0f0602';
const DARK      = '#1a0a02';
const SURFACE   = '#231008';
const GOLD      = '#c9a84c';
const GOLD_DIM  = 'rgba(201,168,76,0.5)';
const GOLD_BG   = 'rgba(201,168,76,0.07)';
const GOLD_BG2  = 'rgba(201,168,76,0.15)';
const TEXT      = 'rgba(255,255,255,0.88)';
const TEXT_DIM  = 'rgba(255,255,255,0.45)';
const TEXT_MUTE = 'rgba(255,255,255,0.22)';
const BORDER    = 'rgba(201,168,76,0.1)';
const BORDER2   = 'rgba(201,168,76,0.22)';
const GREEN     = '#4ade80';
const GREEN_BG  = 'rgba(74,222,128,0.1)';
const RED       = '#f87171';
const RED_BG    = 'rgba(248,113,113,0.1)';
const AMBER     = '#fbbf24';
const AMBER_BG  = 'rgba(251,191,36,0.1)';

interface SaleItem {
  product_id:   string;
  product_name: string;
  price:        number;
  quantity:     number;
  stock:        number;
}

// ── QR Scanner ────────────────────────────────────────────────────────────────
function QRScanner({ onScan, onClose }: { onScan: (t: string) => void; onClose: () => void }) {
  const [error, setError]             = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const cooldownRef                   = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (text) => {
        if (cooldownRef.current) return;
        cooldownRef.current = true;
        setLastScanned(text);
        onScan(text);
        setTimeout(() => { cooldownRef.current = false; }, 1500);
      },
      () => {}
    ).catch(() => setError('No se pudo acceder a la cámara. Verifica los permisos.'));
    return () => { scanner.stop().catch(() => {}); };
  }, [onScan]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,6,2,0.97)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 20, padding: 24 }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20, width: 40, height: 40,
        borderRadius: '50%', background: SURFACE, border: `1px solid ${BORDER2}`,
        color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X style={{ width: 18, height: 18 }} />
      </button>

      <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
        Escanear producto
      </p>

      <div style={{ width: 260, height: 260, position: 'relative', borderRadius: 20,
                    overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        <div id="qr-reader" style={{ width: '100%', height: '100%' }} />
        {([
          { top:-1, left:-1, borderTop:`2px solid ${GOLD}`, borderLeft:`2px solid ${GOLD}`, borderRadius:'8px 0 0 0' },
          { top:-1, right:-1, borderTop:`2px solid ${GOLD}`, borderRight:`2px solid ${GOLD}`, borderRadius:'0 8px 0 0' },
          { bottom:-1, left:-1, borderBottom:`2px solid ${GOLD}`, borderLeft:`2px solid ${GOLD}`, borderRadius:'0 0 0 8px' },
          { bottom:-1, right:-1, borderBottom:`2px solid ${GOLD}`, borderRight:`2px solid ${GOLD}`, borderRadius:'0 0 8px 0' },
        ] as React.CSSProperties[]).map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 32, height: 32, ...s }} />
        ))}
      </div>

      {error && <p style={{ color: RED, fontSize: 13, textAlign: 'center' }}>{error}</p>}

      {lastScanned && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                      borderRadius: 99, background: GREEN_BG, border: '1px solid rgba(74,222,128,0.2)' }}>
          <CheckCircle style={{ width: 14, height: 14, color: GREEN }} />
          <span style={{ color: GREEN, fontSize: 13, fontWeight: 600 }}>{lastScanned}</span>
        </div>
      )}

      <p style={{ color: TEXT_MUTE, fontSize: 12, textAlign: 'center' }}>
        Apunta al QR del sabor · Se suma automáticamente
      </p>
    </div>
  );
}

// ── Zebra / keyboard-wedge scanner ───────────────────────────────────────────
function ZebraInput({ onScan, onClose }: { onScan: (t: string) => void; onClose: () => void }) {
  const [value, setValue]             = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [flash, setFlash]             = useState(false);
  const inputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      const code = value.trim();
      setLastScanned(code);
      setFlash(true);
      onScan(code);
      setValue('');
      setTimeout(() => setFlash(false), 600);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,6,2,0.97)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 24, padding: 24 }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20, width: 40, height: 40,
        borderRadius: '50%', background: SURFACE, border: `1px solid ${BORDER2}`,
        color: TEXT_DIM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X style={{ width: 18, height: 18 }} />
      </button>

      <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
        Modo Zebra / Escáner
      </p>

      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: flash ? `rgba(201,168,76,0.25)` : SURFACE,
        border: `2px solid ${flash ? GOLD : BORDER2}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        <QrCode style={{ width: 36, height: 36, color: flash ? GOLD : TEXT_DIM }} />
      </div>

      <p style={{ color: TEXT_DIM, fontSize: 14, textAlign: 'center', maxWidth: 260 }}>
        Apunta el escáner al código del producto y presiona el gatillo
      </p>

      <div style={{ width: '100%', maxWidth: 320 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => setTimeout(() => inputRef.current?.focus(), 50)}
          placeholder="Escanea o escribe el código..."
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12,
            background: SURFACE, border: `1px solid ${flash ? GOLD : BORDER2}`,
            color: TEXT, fontSize: 16, outline: 'none',
            textAlign: 'center', letterSpacing: 1,
            transition: 'border-color 0.2s',
          }}
        />
        <p style={{ color: TEXT_MUTE, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
          También puedes escribir el código manualmente y presionar Enter
        </p>
      </div>

      {lastScanned && (
        <div style={{
          padding: '10px 20px', borderRadius: 10,
          background: GREEN_BG, border: `1px solid ${GREEN}`,
          color: GREEN, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle style={{ width: 14, height: 14 }} />
          {lastScanned}
        </div>
      )}
    </div>
  );
}

// ── Network badge ─────────────────────────────────────────────────────────────
function NetworkBadge({ isOnline, pendingCount, syncing, onManualSync }: {
  isOnline: boolean; pendingCount: number; syncing: boolean; onManualSync: () => void;
}) {
  if (isOnline && pendingCount === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 99, background: GREEN_BG, border: '1px solid rgba(74,222,128,0.2)',
                  fontSize: 11, fontWeight: 600, color: GREEN }}>
      <Wifi style={{ width: 11, height: 11 }} /> En línea
    </div>
  );

  if (!isOnline) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 99, background: RED_BG, border: '1px solid rgba(248,113,113,0.2)',
                  fontSize: 11, fontWeight: 600, color: RED }}>
      <WifiOff style={{ width: 11, height: 11 }} />
      Sin conexión{pendingCount > 0 ? ` · ${pendingCount} pend.` : ''}
    </div>
  );

  return (
    <button onClick={onManualSync} disabled={syncing} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99,
      background: AMBER_BG, border: '1px solid rgba(251,191,36,0.2)',
      fontSize: 11, fontWeight: 600, color: AMBER, cursor: syncing ? 'default' : 'pointer',
    }}>
      <RefreshCw style={{ width: 11, height: 11, animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
      {syncing ? 'Sincronizando...' : `${pendingCount} pend. · Sync`}
    </button>
  );
}

// ── Checkout modal ────────────────────────────────────────────────────────────
function CheckoutModal({ items, total, isOnline, onConfirm, onCancel, loading }: {
  items: SaleItem[]; total: number; isOnline: boolean;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  const activeItems = items.filter(i => i.quantity > 0);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(15,6,2,0.95)',
                  display: 'flex', alignItems: 'flex-end' }} onClick={onCancel}>
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', background: DARK,
                    borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
                    maxHeight: '80dvh', overflowY: 'auto',
                    border: `1px solid ${BORDER2}`, borderBottom: 'none' }}
           onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: SURFACE, borderRadius: 99, margin: '0 auto 20px' }} />

        {!isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        borderRadius: 12, marginBottom: 16, background: RED_BG,
                        border: '1px solid rgba(248,113,113,0.2)' }}>
            <WifiOff style={{ width: 14, height: 14, color: RED, flexShrink: 0 }} />
            <p style={{ color: RED, fontSize: 12 }}>
              Sin conexión — se guardará y sincronizará automáticamente al reconectarse.
            </p>
          </div>
        )}

        <p style={{ color: GOLD_DIM, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
          Confirmar venta
        </p>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 56, fontWeight: 900,
                      color: GOLD, lineHeight: 1, marginBottom: 20 }}>
          ${total.toFixed(2)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {activeItems.map(item => (
            <div key={item.product_id} style={{ display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: ESPRESSO, borderRadius: 12,
                                                padding: '10px 14px', border: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{item.product_name}</div>
                <div style={{ color: TEXT_DIM, fontSize: 12 }}>
                  {item.quantity} pza{item.quantity > 1 ? 's' : ''} × ${item.price.toFixed(2)}
                </div>
              </div>
              <div style={{ color: GOLD, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800 }}>
                ${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_DIM,
                     borderRadius: 14, padding: 16, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            ← Volver
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 3, background: GOLD, border: 'none', color: DARK, borderRadius: 14,
                     padding: 16, fontSize: 17, fontWeight: 900,
                     cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1, opacity: loading ? 0.7 : 1,
                     display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading
              ? <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              : isOnline ? '✓ CONFIRMAR' : '✓ GUARDAR VENTA'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success overlay ───────────────────────────────────────────────────────────
function SuccessOverlay({ wasOffline }: { wasOffline: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: ESPRESSO,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%',
                    background: wasOffline ? AMBER_BG : GREEN_BG,
                    border: `1px solid ${wasOffline ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle style={{ width: 36, height: 36, color: wasOffline ? AMBER : GREEN }} />
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900,
                    color: GOLD, letterSpacing: 2, textAlign: 'center' }}>
        ¡VENTA REGISTRADA!
      </div>
      {wasOffline
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock style={{ width: 13, height: 13, color: AMBER }} />
            <span style={{ color: AMBER, fontSize: 13 }}>Se enviará al POS cuando haya conexión</span>
          </div>
        : <span style={{ color: TEXT_DIM, fontSize: 13 }}>Registrada correctamente</span>
      }
      <div style={{ width: 180, height: 2, background: SURFACE, borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ height: '100%', background: GOLD, animation: 'syncfill 2s linear forwards' }} />
      </div>
      <style>{`
        @keyframes syncfill { from{width:0} to{width:100%} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ── Product row ───────────────────────────────────────────────────────────────
function ProductRow({ item, onMinus, onPlus, highlight }: {
  item: SaleItem; onMinus: () => void; onPlus: () => void; highlight: boolean;
}) {
  const atMax  = item.quantity >= item.stock;
  const active = item.quantity > 0;

  return (
    <div style={{
      background: highlight ? GOLD_BG2 : active ? GOLD_BG : SURFACE,
      border: `1px solid ${highlight ? GOLD : active ? BORDER2 : BORDER}`,
      borderRadius: 16, padding: '14px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'all 0.2s',
      boxShadow: highlight ? `0 0 16px ${GOLD_BG2}` : 'none',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: TEXT, fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
          {item.product_name}
        </div>
        <div style={{ fontSize: 12, marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: GOLD, fontWeight: 700 }}>${item.price.toFixed(2)}</span>
          <span style={{ color: TEXT_MUTE }}>·</span>
          <span style={{ color: item.stock <= 5 ? RED : TEXT_MUTE }}>{item.stock} disp.</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', background: ESPRESSO, borderRadius: 12,
                    border: `1px solid ${active ? BORDER2 : BORDER}`, overflow: 'hidden', flexShrink: 0 }}>
        <button onClick={onMinus} disabled={item.quantity === 0} onTouchStart={() => {}}
          style={{ width: 52, height: 52, background: 'transparent', border: 'none',
                   color: item.quantity === 0 ? TEXT_MUTE : TEXT_DIM, fontSize: 28, fontWeight: 300,
                   cursor: item.quantity === 0 ? 'not-allowed' : 'pointer',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>

        <div style={{ width: 44, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 800,
                      color: active ? GOLD : TEXT_MUTE, userSelect: 'none' }}>
          {item.quantity}
        </div>

        <button onClick={onPlus} disabled={atMax} onTouchStart={() => {}}
          style={{ width: 52, height: 52, background: 'transparent', border: 'none',
                   color: atMax ? TEXT_MUTE : TEXT_DIM, fontSize: 28, fontWeight: 300,
                   cursor: atMax ? 'not-allowed' : 'pointer',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Sales() {
  const navigate = useNavigate();
  const { user, isAdmin, isSeller, loading: authLoading, signOut } = useAuth();

  const { data: sellerProfile, isLoading: profileLoading } = useMySellerProfile(user?.id);
  const { data: inventory = [] }                           = useMyInventory(sellerProfile?.id);
  const { isOnline, pendingCount, syncing, lastSync, saveSale, tryFlush } = useOfflineSync();

  const [items, setItems]                         = useState<SaleItem[]>([]);
  const [showCheckout, setShowCheckout]           = useState(false);
  const [showQR, setShowQR]                       = useState(false);
  const [showZebra, setShowZebra]                 = useState(false);
  const [submitting, setSubmitting]               = useState(false);
  const [successWasOffline, setSuccessWasOffline] = useState<boolean | null>(null);
  const [highlightId, setHighlightId]             = useState<string | null>(null);
  const [qrNotFound, setQrNotFound]               = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!inventory.length) return;
    setItems(
      inventory
        .filter(inv => inv.quantity > 0)
        .map(inv => ({
          product_id:   inv.product_id,
          product_name: inv.product_name!,
          price:        inv.product_price ?? 0,
          quantity:     0,
          stock:        inv.quantity,
        }))
    );
  }, [inventory]);

  const handleMinus = useCallback((id: string) => {
    setItems(prev => prev.map(i =>
      i.product_id === id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
    ));
  }, []);

  const handlePlus = useCallback((id: string) => {
    setItems(prev => prev.map(i =>
      i.product_id === id && i.quantity < i.stock ? { ...i, quantity: i.quantity + 1 } : i
    ));
  }, []);

  const handleQRScan = useCallback((text: string) => {
    const scanned = text.trim().toLowerCase();
    const match = items.find(item =>
      item.product_name.toLowerCase().includes(scanned) ||
      scanned.includes(item.product_name.toLowerCase())
    );
    if (match && match.quantity < match.stock) {
      setItems(prev => prev.map(i =>
        i.product_id === match.product_id ? { ...i, quantity: i.quantity + 1 } : i
      ));
      setHighlightId(match.product_id);
      setTimeout(() => setHighlightId(null), 800);
      setQrNotFound(null);
    } else if (!match) {
      setQrNotFound(text);
      setTimeout(() => setQrNotFound(null), 2000);
    }
  }, [items]);

// ── Zebra always-on: captura global de teclado ───────────────────────────────
  const zebraBufferRef = useRef('');
  const zebraTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zebraInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showQR || showZebra || showCheckout) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Enter') {
        if (zebraTimerRef.current) clearTimeout(zebraTimerRef.current);
        const code = zebraBufferRef.current.trim();
        if (code.length >= 2) handleQRScan(code);
        zebraBufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        zebraBufferRef.current += e.key;
        if (zebraTimerRef.current) clearTimeout(zebraTimerRef.current);
        zebraTimerRef.current = setTimeout(() => {
          const code = zebraBufferRef.current.trim();
          if (code.length >= 2) handleQRScan(code);
          zebraBufferRef.current = '';
        }, 100);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showQR, showZebra, showCheckout, handleQRScan]);

  const handleZebraInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    zebraBufferRef.current = e.target.value;
    if (zebraTimerRef.current) clearTimeout(zebraTimerRef.current);
    zebraTimerRef.current = setTimeout(() => {
      const code = zebraBufferRef.current.trim();
      if (code.length >= 2) handleQRScan(code);
      zebraBufferRef.current = '';
      if (zebraInputRef.current) zebraInputRef.current.value = '';
    }, 100);
  }, [handleQRScan]);

  const handleZebraKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (zebraTimerRef.current) clearTimeout(zebraTimerRef.current);
      const code = zebraBufferRef.current.trim();
      if (code.length >= 2) handleQRScan(code);
      zebraBufferRef.current = '';
      if (zebraInputRef.current) zebraInputRef.current.value = '';
    }
  }, [handleQRScan]);

  const activeItems = items.filter(i => i.quantity > 0);
  const total       = activeItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleConfirmOrder = async () => {
    if (!sellerProfile || activeItems.length === 0) return;
    setSubmitting(true);
    const wasOffline = !isOnline;
    try {
      await saveSale({
        seller_id: sellerProfile.id, seller_name: sellerProfile.name, total,
        items: activeItems.map(item => ({
          product_id: item.product_id, product_name: item.product_name,
          quantity: item.quantity, unit_price: item.price, subtotal: item.price * item.quantity,
        })),
      });
      setItems(prev => prev.map(i => {
        const sold = activeItems.find(a => a.product_id === i.product_id);
        return sold ? { ...i, quantity: 0, stock: Math.max(0, i.stock - sold.quantity) } : i;
      }));
      setShowCheckout(false);
      setSuccessWasOffline(wasOffline);
      setTimeout(() => setSuccessWasOffline(null), 2500);
    } catch (err) {
      console.error('Error saving sale:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || profileLoading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: ESPRESSO }}>
      <Loader2 style={{ width: 28, height: 28, color: GOLD, animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return null;

  if (!profileLoading && !sellerProfile && !isAdmin) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', background: ESPRESSO, gap: 12, padding: 24 }}>
      <AlertCircle style={{ width: 36, height: 36, color: RED }} />
      <p style={{ color: TEXT, fontSize: 16, fontWeight: 700, textAlign: 'center' }}>
        Tu cuenta no tiene un perfil de vendedor asignado.
      </p>
      <p style={{ color: TEXT_DIM, fontSize: 13, textAlign: 'center' }}>
        Pide al administrador que active tu cuenta desde el POS.
      </p>
      <button onClick={signOut} style={{
        marginTop: 8, padding: '10px 24px', borderRadius: 12,
        border: `1px solid ${BORDER2}`, background: SURFACE,
        color: TEXT_DIM, fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>Cerrar sesión</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh',
                  maxWidth: 420, margin: '0 auto', background: ESPRESSO,
                  fontFamily: "'Barlow',sans-serif", overflow: 'hidden' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />

      {/* ── HEADER ── */}
      <header style={{ padding: '16px 16px 12px', background: DARK,
                       borderBottom: `1px solid ${BORDER}`, flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ color: GOLD_DIM, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
              Vendedor
            </div>
            <div style={{ color: TEXT, fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
              {sellerProfile?.name ?? user?.email?.split('@')[0]}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowQR(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: GOLD_BG, border: `1px solid ${BORDER2}`, color: GOLD,
              borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <QrCode style={{ width: 14, height: 14 }} /> Cámara
            </button>
            <button onClick={() => setShowZebra(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: GOLD_BG2, border: `1px solid ${GOLD}`, color: GOLD,
              borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <QrCode style={{ width: 14, height: 14 }} /> Zebra
            </button>
            <button onClick={() => setItems(prev => prev.map(i => ({ ...i, quantity: 0 })))} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: RED_BG, border: '1px solid rgba(248,113,113,0.2)', color: RED,
              borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
            <button onClick={signOut} style={{
              background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_DIM,
              borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Salir</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <NetworkBadge isOnline={isOnline} pendingCount={pendingCount}
                        syncing={syncing} onManualSync={tryFlush} />
          {lastSync && (
            <span style={{ color: TEXT_MUTE, fontSize: 10 }}>
              Sync: {lastSync.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {qrNotFound && (
          <div style={{ padding: '6px 12px', borderRadius: 8, marginBottom: 8,
                        background: RED_BG, border: '1px solid rgba(248,113,113,0.2)' }}>
            <p style={{ color: RED, fontSize: 12, fontWeight: 600 }}>
              QR no encontrado: "{qrNotFound}"
            </p>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ color: GOLD_DIM, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 48, fontWeight: 900,
                        lineHeight: 1, color: total > 0 ? GOLD : TEXT_MUTE, transition: 'color 0.2s' }}>
            ${total.toFixed(2)}
          </div>
          <div style={{ color: GOLD_DIM, fontSize: 13 }}>MXN</div>
          {activeItems.length > 0 && (
            <div style={{ marginLeft: 'auto', background: GOLD, color: DARK, fontSize: 12,
                          fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                          fontFamily: "'Barlow Condensed',sans-serif" }}>
              {activeItems.reduce((s, i) => s + i.quantity, 0)} pzas
            </div>
          )}
        </div>
      </header>

      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${GOLD}20, transparent)` }} />

      {/* ── PRODUCT LIST ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flex: 1, gap: 12 }}>
            <Package style={{ width: 40, height: 40, color: TEXT_MUTE }} />
            <p style={{ color: TEXT_DIM, fontSize: 14 }}>Sin inventario asignado</p>
            <p style={{ color: TEXT_MUTE, fontSize: 12, textAlign: 'center' }}>
              El administrador debe asignarte productos desde el POS
            </p>
          </div>
        ) : (
          items.map(item => (
            <ProductRow
              key={item.product_id}
              item={item}
              highlight={highlightId === item.product_id}
              onMinus={() => handleMinus(item.product_id)}
              onPlus={()  => handlePlus(item.product_id)}
            />
          ))
        )}
      </div>

      <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${GOLD}20, transparent)` }} />

      {/* ── FOOTER ── */}
      <footer style={{ padding: '12px 16px 28px', background: DARK, flexShrink: 0 }}>
        <button disabled={total === 0} onClick={() => setShowCheckout(true)} style={{
          width: '100%', border: 'none', borderRadius: 16, padding: '18px 20px',
          cursor: total > 0 ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: total > 0 ? (!isOnline ? 'rgba(251,191,36,0.9)' : GOLD) : SURFACE,
          transition: 'all 0.2s',
          boxShadow: total > 0 ? `0 4px 20px rgba(201,168,76,0.25)` : 'none',
        }}>
          <span style={{ color: total > 0 ? DARK : TEXT_MUTE, fontSize: 22, fontWeight: 900,
                         letterSpacing: 1, fontFamily: "'Barlow Condensed',sans-serif" }}>
            {!isOnline && total > 0 ? 'GUARDAR VENTA' : 'COBRAR'}
          </span>
          <span style={{ color: total > 0 ? DARK : TEXT_MUTE, fontSize: 22, fontWeight: 900,
                         fontFamily: "'Barlow Condensed',sans-serif" }}>
            ${total.toFixed(2)} MXN
          </span>
        </button>
      </footer>

      {/* Input invisible always-on para Zebra TC56 */}
      {!showQR && !showZebra && !showCheckout && (
        <input
          ref={zebraInputRef}
          onChange={handleZebraInput}
          onKeyDown={handleZebraKeyDown}
          style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 1, height: 1, top: -99 }}
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />
      )}

      {/* ── MODALS ── */}
      {showQR    && <QRScanner   onScan={handleQRScan} onClose={() => setShowQR(false)} />}
      {showZebra && <ZebraInput  onScan={handleQRScan} onClose={() => setShowZebra(false)} />}

      {showCheckout && (
        <CheckoutModal items={items} total={total} isOnline={isOnline}
                       onConfirm={handleConfirmOrder} onCancel={() => setShowCheckout(false)}
                       loading={submitting} />
      )}

      {successWasOffline !== null && <SuccessOverlay wasOffline={successWasOffline} />}
    </div>
  );
}
