import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface QRCodeDisplayProps {
  menuUrl: string;
  showButton?: boolean;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ menuUrl, showButton = true, size = 200, className = '' }: QRCodeDisplayProps) {
  const downloadQR = () => {
    const svg = document.getElementById('menu-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'menu-qr-code.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!menuUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <QrCode className="w-12 h-12 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">Configura la URL del menú para generar el código QR</p>
      </div>
    );
  }

  if (showButton) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <QrCode className="w-4 h-4 mr-2" />
            Código QR
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR del Menú</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG
                id="menu-qr-code"
                value={menuUrl}
                size={size}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Escanea este código para acceder al menú digital
            </p>
            <Button onClick={downloadQR} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Descargar PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <QRCodeSVG
          id="menu-qr-code"
          value={menuUrl}
          size={size}
          level="H"
          includeMargin
        />
      </div>
      <p className="text-sm text-center opacity-80">
        Escanea para ver el menú
      </p>
    </div>
  );
}
