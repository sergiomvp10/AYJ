import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api, VinDecoded } from '@/lib/api';
import { Loader2, X } from 'lucide-react';

interface VinDecoderInputProps {
  onDecoded: (decoded: VinDecoded) => void;
  className?: string;
  showLabel?: boolean;
  showCounter?: boolean;
}

export function VinDecoderInput({ onDecoded, className, showLabel = true, showCounter = true }: VinDecoderInputProps) {
  const { t } = useTranslation(['vin', 'toasts']);
  const { toast } = useToast();
  const [vin, setVin] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  const handleDecode = async () => {
    if (!vin || vin.length !== 17) {
      toast({
        description: t('toasts:vin.invalid_format'),
        variant: 'destructive',
      });
      return;
    }

    setIsDecoding(true);
    try {
      const decoded = await api.decodeVin(vin);
      toast({
        description: t('toasts:vin.decode_success'),
      });
      onDecoded(decoded);
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
    } finally {
      setIsDecoding(false);
    }
  };

  const handleClear = () => {
    setVin('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && vin.length === 17) {
      handleDecode();
    }
  };

  return (
    <div className={className}>
      {showLabel && <Label htmlFor="vin-input">{t('vin:input_label')}</Label>}
      <div className={`flex gap-2 ${showLabel ? 'mt-1' : ''}`}>
        <div className="relative flex-1">
          <Input
            id="vin-input"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))}
            onKeyPress={handleKeyPress}
            placeholder={t('vin:input_placeholder')}
            maxLength={17}
            className="pr-8"
          />
          {vin && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          onClick={handleDecode}
          disabled={vin.length !== 17 || isDecoding}
        >
          {isDecoding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('vin:decoding')}
            </>
          ) : (
            t('vin:decode_button')
          )}
        </Button>
      </div>
      {showCounter && (
        <p className="text-sm text-gray-500 mt-1">
          {vin.length}/17
        </p>
      )}
    </div>
  );
}
