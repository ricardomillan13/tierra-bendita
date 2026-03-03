import { Link } from 'react-router-dom';
import { QrCode, Smartphone, ClipboardList, MessageCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Index() {
  return (
    <div className="min-h-screen bg-[#0e0806] text-white font-['Inter',sans-serif]">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col">

        {/* Background image */}
        <img
          src="/local-1.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center center' }}
        />

        {/* Warm dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(14,8,6,0.55) 0%, rgba(30,12,6,0.45) 35%, rgba(14,8,6,0.80) 70%, rgba(10,5,3,0.97) 100%)',
          }}
        />

        {/* Admin link — top right */}
        <div className="relative z-10 flex justify-end p-5">
          <Link
            to="/auth"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-400 transition-colors duration-300"
          >
            <Settings className="w-3 h-3" />
            Admin
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center pb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-12 bg-amber-600/60" />
            <span className="text-amber-500/80 text-xs tracking-[0.3em] uppercase font-light">
              Chocolate & Coffee Shop
            </span>
            <div className="h-px w-12 bg-amber-600/60" />
          </div>

          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Tierra Bendita
          </h1>

          <p
            className="text-3xl sm:text-4xl md:text-5xl font-light text-amber-400/90 mb-6"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}
          >
            Chocolate & Coffee Shop
          </p>

          <p className="text-white/60 text-base md:text-lg max-w-md mb-12 leading-relaxed font-light">
            Ordena desde tu mesa, nosotros nos encargamos del resto.
          </p>

          <Link to="/menu">
            <Button
              size="lg"
              className="px-10 py-6 text-base rounded-full font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-amber-900/40 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)',
                border: 'none',
                color: '#fff',
              }}
            >
              Ver Menú
            </Button>
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex flex-col items-center pb-8 gap-1 opacity-40">
          <div className="w-px h-8 bg-white/50 animate-pulse" />
          <span className="text-[10px] tracking-widest uppercase text-white/50">scroll</span>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(180deg, #0e0806 0%, #150d08 100%)' }}>
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-10 bg-amber-700/50" />
              <span className="text-amber-600/70 text-xs tracking-[0.25em] uppercase">El proceso</span>
              <div className="h-px w-10 bg-amber-700/50" />
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              ¿Cómo funciona?
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <StepCard number={1} icon={<QrCode className="w-5 h-5" />} title="Escanea el QR" description="Escanea el código QR en tu mesa con tu celular" />
            <StepCard number={2} icon={<Smartphone className="w-5 h-5" />} title="Elige tu orden" description="Navega el menú y agrega lo que quieras al carrito" />
            <StepCard number={3} icon={<ClipboardList className="w-5 h-5" />} title="Preparamos" description="Tu pedido llega al panel al instante, nos ponemos a trabajar" />
            <StepCard number={4} icon={<MessageCircle className="w-5 h-5" />} title="Te avisamos" description="Recibes una notificación por WhatsApp cuando esté listo" />
          </div>

          {/* Photo gallery */}
          <div className="mt-20 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-xl" style={{ height: '240px' }}>
              <img
                src="/local-2.jpg"
                alt="Vista del local"
                className="w-full h-full transition-transform duration-700 hover:scale-105"
                style={{ objectFit: 'cover', objectPosition: 'center center' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,8,6,0.7) 0%, transparent 50%)' }} />
            </div>
            <div className="relative overflow-hidden rounded-xl" style={{ height: '240px' }}>
              <img
                src="/local-3.jpg"
                alt="Vitrina de postres"
                className="w-full h-full transition-transform duration-700 hover:scale-105"
                style={{ objectFit: 'cover', objectPosition: 'center center' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,8,6,0.7) 0%, transparent 50%)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: '1px solid rgba(180,83,9,0.15)', background: '#0a0503' }}>
        <p className="text-white/25 text-sm">© 2025 Tierra Bendita Chocolate & Coffee Shop</p>
      </footer>
    </div>
  );
}

function StepCard({ number, icon, title, description }: { number: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-sm font-bold transition-transform duration-300 group-hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #78350f, #b45309)', boxShadow: '0 4px 20px rgba(180,83,9,0.3)' }}
      >
        {number}
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-amber-500"
        style={{ background: 'rgba(180,83,9,0.12)', border: '1px solid rgba(180,83,9,0.2)' }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
      <p className="text-white/40 text-xs leading-relaxed">{description}</p>
    </div>
  );
}