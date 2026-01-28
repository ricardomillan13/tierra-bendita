import { Link } from 'react-router-dom';
import { Coffee, Smartphone, Monitor, ClipboardList, QrCode, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="gradient-warm text-primary-foreground">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <Coffee className="w-10 h-10" />
            </div>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-4">
            Tierra Bendita Cafe
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-2xl mx-auto">
            Sistema de menú digital con punto de venta y notificaciones por WhatsApp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8">
                <Smartphone className="w-5 h-5 mr-2" />
                Ver Menú
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-primary-foreground/20 backdrop-blur-sm border-2 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/30">
                <ClipboardList className="w-5 h-5 mr-2" />
                Panel POS
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            Funcionalidades
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Smartphone className="w-8 h-8" />}
              title="Menú Digital"
              description="Tus clientes ordenan desde su celular escaneando un código QR. Carrito de compras y pedidos instantáneos."
            />
            <FeatureCard
              icon={<ClipboardList className="w-8 h-8" />}
              title="Panel POS"
              description="Gestiona pedidos en tiempo real, actualiza estados, imprime tickets y administra productos."
            />
            <FeatureCard
              icon={<Monitor className="w-8 h-8" />}
              title="Display TV"
              description="Pantalla publicitaria para tu local con el menú rotando automáticamente. Ideal para monitores y TVs."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-secondary/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            ¿Cómo funciona?
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <StepCard
              number={1}
              icon={<QrCode className="w-6 h-6" />}
              title="Escanea QR"
              description="El cliente escanea el código QR en su mesa"
            />
            <StepCard
              number={2}
              icon={<Smartphone className="w-6 h-6" />}
              title="Ordena"
              description="Navega el menú y agrega productos al carrito"
            />
            <StepCard
              number={3}
              icon={<ClipboardList className="w-6 h-6" />}
              title="Preparamos"
              description="El pedido aparece en el panel POS automáticamente"
            />
            <StepCard
              number={4}
              icon={<MessageCircle className="w-6 h-6" />}
              title="Notificamos"
              description="Avisamos al cliente por WhatsApp cuando está listo"
            />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-8">Acceso Rápido</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Smartphone className="w-5 h-5 mr-2" />
                Menú Clientes
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <ClipboardList className="w-5 h-5 mr-2" />
                Panel Admin
              </Button>
            </Link>
            <Link to="/display">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Monitor className="w-5 h-5 mr-2" />
                Pantalla Display
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center text-muted-foreground">
        <p>© 2025 Tierra Bendita Cafe - Sistema de Menú Digital</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 text-center hover:shadow-medium transition-shadow">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({ number, icon, title, description }: { number: number; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full gradient-warm text-primary-foreground flex items-center justify-center mx-auto mb-4 font-bold text-lg">
        {number}
      </div>
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-3 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
