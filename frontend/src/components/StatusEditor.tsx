import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusEditorProps {
  status: string;
  repairId: string;
  onStatusUpdate: (repairId: string, newStatus: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  'pending',
  'assigned',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled',
  'paid',
  'balance_pending',
] as const;

const STATUS_VARIANTS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  assigned: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  waiting_parts: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  completed: 'bg-green-100 text-green-800 hover:bg-green-200',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-200',
  paid: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  balance_pending: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  in_progress: 'En Progreso',
  waiting_parts: 'Esperando Piezas',
  completed: 'Completado',
  cancelled: 'Cancelado',
  paid: 'Pagado',
  balance_pending: 'Saldo Pendiente',
};

export function StatusEditor({ status, repairId, onStatusUpdate }: StatusEditorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectStatus = async (newStatus: string) => {
    if (newStatus === status || saving) return;
    
    setSaving(true);
    try {
      await onStatusUpdate(repairId, newStatus);
      setOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          onClick={() => setOpen(!open)}
        >
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              STATUS_VARIANTS[status] || 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
          >
            {STATUS_LABELS[status] || status}
            <span className="ml-1">▾</span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 z-50" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {STATUS_OPTIONS.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelectStatus(option)}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      status === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{STATUS_LABELS[option]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
