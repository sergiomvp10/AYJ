import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api, VinDecoded } from '@/lib/api';
import { Camera, Loader2, X, Upload, SwitchCamera } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface VinScannerProps {
  onDecoded: (decoded: VinDecoded) => void;
  className?: string;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface DiagnosticInfo {
  streamAcquired: boolean;
  trackState: string;
  trackLabel: string;
  trackEnabled: boolean;
  trackMuted: boolean;
  trackSettingsWidth: number;
  trackSettingsHeight: number;
  videoReady: number;
  videoWidth: number;
  videoHeight: number;
  receivingFrames: boolean;
  canPlay: boolean;
  isPlaying: boolean;
}

const BUILD_TIMESTAMP = '2025-12-08T03:25:00Z';

export function VinScanner({ onDecoded, className }: VinScannerProps) {
  const { t } = useTranslation(['vin', 'toasts']);
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [needsUserGesture, setNeedsUserGesture] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo>({
    streamAcquired: false,
    trackState: 'none',
    trackLabel: 'none',
    trackEnabled: false,
    trackMuted: false,
    trackSettingsWidth: 0,
    trackSettingsHeight: 0,
    videoReady: 0,
    videoWidth: 0,
    videoHeight: 0,
    receivingFrames: false,
    canPlay: false,
    isPlaying: false,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        }));
      setCameras(videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      return [];
    }
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      let mediaStream: MediaStream | null = null;
      
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
      initialStream.getTracks().forEach(track => track.stop());
      
      const availableCameras = await enumerateCameras();
      
      const constraints = deviceId
        ? [{ video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }]
        : [
            ...(availableCameras.length > 0 && availableCameras.find(c => c.label.toLowerCase().includes('back'))
              ? [{ video: { deviceId: { exact: availableCameras.find(c => c.label.toLowerCase().includes('back'))!.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }]
              : []),
            { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            { video: { facingMode: { ideal: 'environment' } } },
            { video: { facingMode: 'user' } },
            { video: true }
          ];
      
      for (const constraint of constraints) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (mediaStream) break;
        } catch (err) {
          console.error('Constraint failed:', constraint, err);
          continue;
        }
      }
      
      if (!mediaStream) {
        throw new Error('Could not access camera');
      }
      
      setStream(mediaStream);
      setShowCamera(true);
      
      const track = mediaStream.getVideoTracks()[0];
      setDiagnostics(prev => ({
        ...prev,
        streamAcquired: true,
        trackState: track.readyState,
        trackLabel: track.label,
      }));
    } catch (error) {
      console.error('Camera start error:', error);
      toast({
        description: t('toasts:vin.camera_error'),
        variant: 'destructive',
      });
    }
  }, [toast, t, stream, enumerateCameras]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startCamera(cameras[nextIndex].deviceId);
  }, [cameras, currentCameraIndex, startCamera]);

  const handleUserGestureStart = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !stream) return;

    setNeedsUserGesture(false);

    video.setAttribute('muted', '');
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.playsInline = true;
    
    video.srcObject = stream;

    try {
      await video.play();
      console.log('Video play succeeded after user gesture');
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log('Video still 0x0 after 2s, trying constraint relaxation');
          const track = stream.getVideoTracks()[0];
          try {
            await track.applyConstraints({
              width: { min: 320, ideal: 640 },
              height: { min: 240, ideal: 480 }
            });
            console.log('Applied relaxed constraints');
          } catch (err) {
            console.error('Failed to apply constraints:', err);
          }
        }
      }, 2000);
    } catch (err) {
      console.error('Video play failed after user gesture:', err);
    }
  }, [stream]);

  const retryCamera = useCallback(async () => {
    if (!stream) return;
    
    const currentDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
    
    stream.getTracks().forEach(track => track.stop());
    setStream(null);
    
    try {
      const constraints = currentDeviceId
        ? [
            { video: { deviceId: { exact: currentDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } } },
            { video: { deviceId: { exact: currentDeviceId } } },
            { video: true }
          ]
        : [
            { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
            { video: true }
          ];
      
      let newStream: MediaStream | null = null;
      for (const constraint of constraints) {
        try {
          newStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (newStream) break;
        } catch (err) {
          console.error('Retry constraint failed:', constraint, err);
          continue;
        }
      }
      
      if (newStream) {
        setStream(newStream);
        setNeedsUserGesture(true);
        
        const track = newStream.getVideoTracks()[0];
        const settings = track.getSettings();
        setDiagnostics(prev => ({
          ...prev,
          streamAcquired: true,
          trackState: track.readyState,
          trackLabel: track.label,
          trackEnabled: track.enabled,
          trackMuted: track.muted,
          trackSettingsWidth: settings.width || 0,
          trackSettingsHeight: settings.height || 0,
        }));
      }
    } catch (error) {
      console.error('Retry camera failed:', error);
      toast({
        description: t('toasts:vin.camera_error'),
        variant: 'destructive',
      });
    }
  }, [stream, toast, t]);

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
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setShowCamera(false);
    setNeedsUserGesture(true);
    setDiagnostics({
      streamAcquired: false,
      trackState: 'none',
      trackLabel: 'none',
      trackEnabled: false,
      trackMuted: false,
      trackSettingsWidth: 0,
      trackSettingsHeight: 0,
      videoReady: 0,
      videoWidth: 0,
      videoHeight: 0,
      receivingFrames: false,
      canPlay: false,
      isPlaying: false,
    });
  }, [stream]);

  useEffect(() => {
    if (!showCamera || !stream) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    if (!needsUserGesture) {
      video.srcObject = stream;
      video.muted = true;
    }
    
    const handleCanPlay = () => {
      setDiagnostics(prev => ({ ...prev, canPlay: true }));
    };
    
    const handlePlaying = () => {
      setDiagnostics(prev => ({ ...prev, isPlaying: true }));
    };
    
    const handleLoadedMetadata = () => {
      if (!needsUserGesture) {
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch((err) => {
            console.error('Video play failed:', err);
          });
        }
      }
      
      setDiagnostics(prev => ({
        ...prev,
        videoReady: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        receivingFrames: video.videoWidth > 0 && video.videoHeight > 0,
      }));
    };
    
    const handleLoadedData = () => {
      if (!needsUserGesture) {
        video.play().catch((err) => {
          console.error('Video play on loadeddata failed:', err);
        });
      }
      
      setDiagnostics(prev => ({
        ...prev,
        videoReady: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        receivingFrames: video.videoWidth > 0 && video.videoHeight > 0,
      }));
    };
    
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    
    if (!needsUserGesture) {
      setTimeout(() => {
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch((err) => {
            console.error('Video play (delayed) failed:', err);
          });
        }
      }, 100);
    }
    
    const diagnosticInterval = setInterval(() => {
      if (video && stream) {
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings() || {};
        setDiagnostics(prev => ({
          ...prev,
          trackState: track?.readyState || 'none',
          trackEnabled: track?.enabled || false,
          trackMuted: track?.muted || false,
          trackSettingsWidth: settings.width || 0,
          trackSettingsHeight: settings.height || 0,
          videoReady: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          receivingFrames: video.videoWidth > 0 && video.videoHeight > 0,
        }));
      }
    }, 1000);
    
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      clearInterval(diagnosticInterval);
    };
  }, [stream, showCamera, needsUserGesture]);

  const processImageForVin = async (imageSource: HTMLVideoElement | HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    if (imageSource instanceof HTMLVideoElement) {
      canvas.width = imageSource.videoWidth;
      canvas.height = imageSource.videoHeight;
    } else {
      canvas.width = imageSource.width;
      canvas.height = imageSource.height;
    }

    context.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

    try {
      const result = await Tesseract.recognize(
        canvas,
        'eng',
        {
          logger: () => {}
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
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    try {
      await processImageForVin(videoRef.current);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = async (e) => {
        img.src = e.target?.result as string;
        img.onload = async () => {
          await processImageForVin(img);
          setIsProcessing(false);
        };
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        description: t('toasts:vin.scan_error'),
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => startCamera()}
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
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full min-h-[300px] bg-black"
                style={{ objectFit: 'cover' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {needsUserGesture && (
                <div 
                  className="absolute inset-0 bg-black/80 flex items-center justify-center cursor-pointer"
                  onClick={handleUserGestureStart}
                >
                  <div className="text-center text-white p-6">
                    <div className="text-6xl mb-4">▶️</div>
                    <div className="text-xl font-semibold mb-2">Toca para iniciar video</div>
                    <div className="text-sm text-gray-300">Se requiere interacción del usuario</div>
                  </div>
                </div>
              )}
              
              {cameras.length > 1 && !needsUserGesture && (
                <Button
                  onClick={switchCamera}
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  disabled={isProcessing}
                  title="Switch Camera"
                >
                  <SwitchCamera className="h-4 w-4" />
                </Button>
              )}
              
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className={diagnostics.receivingFrames ? 'text-green-400' : 'text-red-400'}>
                    {diagnostics.receivingFrames ? '● Receiving frames' : '● No frames'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Video:</span>
                  <span>{diagnostics.videoWidth}x{diagnostics.videoHeight}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Track:</span>
                  <span>{diagnostics.trackSettingsWidth}x{diagnostics.trackSettingsHeight}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Camera:</span>
                  <span className="truncate max-w-[150px]">{diagnostics.trackLabel}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span>State: {diagnostics.trackState}</span>
                  <span>En: {diagnostics.trackEnabled ? 'Y' : 'N'}</span>
                  <span>Mu: {diagnostics.trackMuted ? 'Y' : 'N'}</span>
                  <span>CP: {diagnostics.canPlay ? 'Y' : 'N'}</span>
                  <span>PL: {diagnostics.isPlaying ? 'Y' : 'N'}</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              {t('vin:scan_instructions')}
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={captureAndProcess}
                disabled={isProcessing || !diagnostics.receivingFrames}
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
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isProcessing}
                title="Upload VIN Photo"
              >
                <Upload className="h-4 w-4" />
              </Button>
              
              {!diagnostics.receivingFrames && !needsUserGesture && (
                <Button
                  onClick={retryCamera}
                  variant="outline"
                  disabled={isProcessing}
                  title="Retry Camera"
                >
                  <Loader2 className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                onClick={stopCamera}
                variant="outline"
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="text-xs text-gray-400 text-center">
              Build: {BUILD_TIMESTAMP}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
