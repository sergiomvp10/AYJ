import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api, VinDecoded } from '@/lib/api';
import { Camera, X, Upload, SwitchCamera } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

interface VinScannerProps {
  onDecoded: (decoded: VinDecoded) => void;
  className?: string;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

const normalizeVinCharacters = (text: string): string => {
  return text
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
    .replace(/I/g, '1')
    .replace(/[^A-HJ-NPR-Z0-9]/g, '');
};

const rotateCanvas = (canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement => {
  const rotatedCanvas = document.createElement('canvas');
  const ctx = rotatedCanvas.getContext('2d');
  if (!ctx) return canvas;

  if (degrees === 90 || degrees === 270) {
    rotatedCanvas.width = canvas.height;
    rotatedCanvas.height = canvas.width;
  } else {
    rotatedCanvas.width = canvas.width;
    rotatedCanvas.height = canvas.height;
  }

  ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotatedCanvas;
};

const adjustBrightnessContrast = (
  imageData: ImageData,
  brightness: number,
  contrast: number
): ImageData => {
  const data = imageData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128 + brightness;
    data[i + 1] = factor * (data[i + 1] - 128) + 128 + brightness;
    data[i + 2] = factor * (data[i + 2] - 128) + 128 + brightness;
  }

  return imageData;
};

const grayscale = (imageData: ImageData): ImageData => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;
    data[i + 1] = avg;
    data[i + 2] = avg;
  }
  return imageData;
};

const threshold = (imageData: ImageData, level: number): ImageData => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const val = avg > level ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  return imageData;
};

const invert = (imageData: ImageData): ImageData => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return imageData;
};

export function VinScanner({ onDecoded, className }: VinScannerProps) {
  const { t } = useTranslation(['vin', 'toasts']);
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [needsUserGesture, setNeedsUserGesture] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const barcodeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastDetectedVinRef = useRef<string>('');
  const scanningRef = useRef<boolean>(false);
  const barcodeAttemptCountRef = useRef<number>(0);

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

  const initializeWorker = useCallback(async () => {
    if (workerRef.current) return workerRef.current;
    
    try {
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      });
      workerRef.current = worker;
      return worker;
    } catch (error) {
      console.error('Failed to initialize Tesseract worker:', error);
      return null;
    }
  }, []);

  const initializeBarcodeReader = useCallback(() => {
    if (barcodeReaderRef.current) return barcodeReaderRef.current;
    
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_39, 
        BarcodeFormat.CODE_128, 
        BarcodeFormat.ITF
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      const reader = new BrowserMultiFormatReader(hints);
      barcodeReaderRef.current = reader;
      return reader;
    } catch (error) {
      console.error('Failed to initialize barcode reader:', error);
      return null;
    }
  }, []);

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
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (barcodeReaderRef.current) {
      barcodeReaderRef.current.reset();
      barcodeReaderRef.current = null;
    }
    setShowCamera(false);
    setNeedsUserGesture(true);
    setIsScanning(false);
    scanningRef.current = false;
    lastDetectedVinRef.current = '';
    barcodeAttemptCountRef.current = 0;
  }, [stream]);

  const scanFrameForVin = useCallback(async () => {
    if (scanningRef.current || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    scanningRef.current = true;
    setIsScanning(true);
    
    try {
      const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
      
      const targetWidth = Math.min(video.videoWidth, 800);
      const scale = targetWidth / video.videoWidth;
      const targetHeight = video.videoHeight * scale;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        scanningRef.current = false;
        setIsScanning(false);
        return;
      }
      
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      
      if (barcodeAttemptCountRef.current < 10) {
        barcodeAttemptCountRef.current++;
        
        try {
          const reader = initializeBarcodeReader();
          if (reader) {
            const barcodeRotations = [0, 90];
            
            for (const rotation of barcodeRotations) {
              try {
                const rotatedCanvas = rotateCanvas(canvas, rotation);
                const binaryBitmap = reader.createBinaryBitmap(rotatedCanvas as any);
                const result = reader.decodeBitmap(binaryBitmap);
                
                if (result) {
                  let barcodeText = result.getText().toUpperCase().trim();
                  barcodeText = barcodeText.replace(/^\*|\*$/g, '');
                  const normalized = normalizeVinCharacters(barcodeText);
                  const match = normalized.match(vinPattern);
                  
                  if (match) {
                    const detectedVin = match[0];
                    
                    if (detectedVin !== lastDetectedVinRef.current) {
                      console.log(`VIN detected from barcode at ${rotation}°: ${detectedVin}`);
                      lastDetectedVinRef.current = detectedVin;
                      
                      try {
                        const decoded = await api.decodeVin(detectedVin);
                        toast({
                          description: t('toasts:vin.scan_success'),
                        });
                        onDecoded(decoded);
                        stopCamera();
                        scanningRef.current = false;
                        setIsScanning(false);
                        return;
                      } catch (error: any) {
                        console.log(`VIN ${detectedVin} from barcode failed to decode, continuing...`);
                      }
                    }
                  }
                }
              } catch (error) {
              }
            }
          }
        } catch (error) {
        }
      }
      
      if (barcodeAttemptCountRef.current >= 10) {
        const worker = await initializeWorker();
        if (!worker) {
          scanningRef.current = false;
          setIsScanning(false);
          return;
        }
        
        const rotations = [0, 90, 270];
        
        for (const rotation of rotations) {
          const rotatedCanvas = rotateCanvas(canvas, rotation);
          const rotatedCtx = rotatedCanvas.getContext('2d');
          if (!rotatedCtx) continue;
          
          const roiCanvas = document.createElement('canvas');
          const roiCtx = roiCanvas.getContext('2d');
          if (!roiCtx) continue;
          
          if (rotation === 0) {
            const roiHeight = Math.floor(rotatedCanvas.height * 0.6);
            const roiY = Math.floor((rotatedCanvas.height - roiHeight) / 2);
            roiCanvas.width = rotatedCanvas.width;
            roiCanvas.height = roiHeight;
            roiCtx.drawImage(rotatedCanvas, 0, roiY, rotatedCanvas.width, roiHeight, 0, 0, rotatedCanvas.width, roiHeight);
          } else {
            const roiWidth = Math.floor(rotatedCanvas.width * 0.6);
            const roiX = Math.floor((rotatedCanvas.width - roiWidth) / 2);
            roiCanvas.width = roiWidth;
            roiCanvas.height = rotatedCanvas.height;
            roiCtx.drawImage(rotatedCanvas, roiX, 0, roiWidth, rotatedCanvas.height, 0, 0, roiWidth, rotatedCanvas.height);
          }
          
          const imageData = roiCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
          const processed = invert(threshold(grayscale(imageData), 150));
          roiCtx.putImageData(processed, 0, 0);
          
          const result = await worker.recognize(roiCanvas);
          const rawText = result.data.text;
          const normalized = normalizeVinCharacters(rawText);
          const match = normalized.match(vinPattern);
          
          if (match) {
            const detectedVin = match[0];
            
            if (detectedVin === lastDetectedVinRef.current) {
              continue;
            }
            
            console.log(`VIN detected via OCR at ${rotation}°: ${detectedVin}`);
            lastDetectedVinRef.current = detectedVin;
            
            try {
              const decoded = await api.decodeVin(detectedVin);
              toast({
                description: t('toasts:vin.scan_success'),
              });
              onDecoded(decoded);
              stopCamera();
              scanningRef.current = false;
              setIsScanning(false);
              return;
            } catch (error: any) {
              console.log(`VIN ${detectedVin} failed to decode, continuing...`);
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error('Scan frame error:', error);
    }
    
    scanningRef.current = false;
    setIsScanning(false);
  }, [initializeWorker, initializeBarcodeReader, onDecoded, stopCamera, t, toast]);

  useEffect(() => {
    if (!showCamera || !stream) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    if (!needsUserGesture) {
      video.srcObject = stream;
      video.muted = true;
    }
    
    const handlePlaying = () => {
      if (!needsUserGesture && !scanIntervalRef.current) {
        scanIntervalRef.current = setInterval(() => {
          scanFrameForVin();
        }, 600);
      }
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
    };
    
    const handleLoadedData = () => {
      if (!needsUserGesture) {
        video.play().catch((err) => {
          console.error('Video play on loadeddata failed:', err);
        });
      }
    };
    
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
    
    return () => {
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [stream, showCamera, needsUserGesture, scanFrameForVin]);

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

    const vinPattern = /[A-HJ-NPR-Z0-9]{17}/;
    const rotations = [0, 90, 270, 180];
    const preprocessVariants = [
      { name: 'raw', fn: null },
      { name: 'grayscale+contrast', fn: (imgData: ImageData) => adjustBrightnessContrast(grayscale(imgData), 0, 30) },
      { name: 'threshold150', fn: (imgData: ImageData) => threshold(grayscale(imgData), 150) },
      { name: 'threshold180', fn: (imgData: ImageData) => threshold(grayscale(imgData), 180) },
    ];

    let allDetectedText = '';
    
    for (const rotation of rotations) {
      const rotatedCanvas = rotateCanvas(canvas, rotation);
      const rotatedCtx = rotatedCanvas.getContext('2d');
      if (!rotatedCtx) continue;

      for (const variant of preprocessVariants) {
        try {
          let processedCanvas = rotatedCanvas;
          
          if (variant.fn) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = rotatedCanvas.width;
            tempCanvas.height = rotatedCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) continue;
            
            tempCtx.drawImage(rotatedCanvas, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const processed = variant.fn(imageData);
            tempCtx.putImageData(processed, 0, 0);
            processedCanvas = tempCanvas;
          }

          const result = await Tesseract.recognize(
            processedCanvas,
            'eng',
            {
              logger: () => {}
            }
          );

          const rawText = result.data.text;
          allDetectedText += `[${rotation}°/${variant.name}]: ${rawText}\n`;
          
          const normalized = normalizeVinCharacters(rawText);
          const match = normalized.match(vinPattern);

          if (match) {
            const detectedVin = match[0];
            console.log(`VIN found at ${rotation}°/${variant.name}: ${detectedVin}`);
            
            try {
              const decoded = await api.decodeVin(detectedVin);
              toast({
                description: t('toasts:vin.scan_success'),
              });
              onDecoded(decoded);
              stopCamera();
              return;
            } catch (error: any) {
              console.log(`VIN ${detectedVin} failed to decode, continuing search...`);
              continue;
            }
          }
        } catch (error) {
          console.error(`OCR failed for ${rotation}°/${variant.name}:`, error);
          continue;
        }
      }
    }

    console.log('All OCR attempts:\n', allDetectedText);
    
    toast({
      description: t('toasts:vin.no_vin_detected') + ' Intenta con mejor iluminación y enfoque.',
      variant: 'destructive',
    });
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
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4 text-white hover:bg-white/20"
                  disabled={isProcessing}
                  title="Cambiar Cámara"
                >
                  <SwitchCamera className="h-6 w-6" />
                </Button>
              )}
              
              {!needsUserGesture && isScanning && (
                <div className="absolute bottom-4 right-4 text-white text-xs">
                  Escaneando...
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isProcessing}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir Foto
              </Button>
              
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
