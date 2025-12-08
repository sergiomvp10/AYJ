import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api, VinDecoded } from '@/lib/api';
import { Camera, Loader2, X } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface VinScannerProps {
  onDecoded: (decoded: VinDecoded) => void;
  className?: string;
}

export function VinScanner({ onDecoded, className }: VinScannerProps) {
  const { t } = useTranslation(['vin', 'toasts']);
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      toast({
        description: t('toasts:vin.camera_error'),
        variant: 'destructive',
      });
    }
  }, [toast, t]);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  useEffect(() => {
    if (!showCamera) return;
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = true; // Required for autoplay on iOS/Safari
      const playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {
        });
      }
    }
  }, [stream, showCamera]);

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const result = await Tesseract.recognize(
        canvas,
        'eng',
        {
          logger: () => {} // Suppress logs
        }
      );

      const text = result.data.text.toUpperCase();
      
      const vinPattern = /[A-HJ-NPR-Z0-9]{17}/g;
      const matches = text.match(vinPattern);

      if (matches && matches.length > 0) {
        const detectedVin = matches[0];
        
        try {
          const decoded = await api.decodeVin(detectedVin);
          toast({
            description: t('toasts:vin.scan_success'),
          });
          onDecoded(decoded);
          stopCamera();
        } catch (error: any) {
          const errorMessage = error.message || '';
          let toastMessage = t('toasts:vin.decode_error');
          
          if (errorMessage.includes('Invalid VIN format')) {
            toastMessage = t('toasts:vin.invalid_format');
          } else if (errorMessage.includes('No data found') || errorMessage.includes('No vehicle data')) {
            toastMessage = t('toasts:vin.no_data');
          } else if (errorMessage.includes('unavailable')) {
            toastMessage = t('toasts:vin.service_unavailable');
          }
          
          toast({
            description: toastMessage,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          description: t('toasts:vin.no_vin_detected'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        description: t('toasts:vin.scan_error'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={startCamera}
        variant="outline"
        className={className}
        size="icon"
        aria-label={t('vin:scan_button')}
        title={t('vin:scan_button')}
      >
        <Camera className="h-4 w-4" />
      </Button>

      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('vin:scan_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={() => videoRef.current?.play()}
                className="w-full aspect-video bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <p className="text-sm text-gray-600 text-center">
              {t('vin:scan_instructions')}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={captureAndProcess}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('vin:processing')}
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    {t('vin:capture_button')}
                  </>
                )}
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                disabled={isProcessing}
              >
                <X className="mr-2 h-4 w-4" />
                {t('vin:cancel_button')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
