import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, Mechanic, MechanicWorkResponse } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface MechanicWorkDialogProps {
  mechanic: Mechanic | null;
  open: boolean;
  onClose: () => void;
}

export function MechanicWorkDialog({ mechanic, open, onClose }: MechanicWorkDialogProps) {
  const { t } = useTranslation(['mechanics', 'repairs', 'common']);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workData, setWorkData] = useState<MechanicWorkResponse | null>(null);

  useEffect(() => {
    if (open && mechanic) {
      loadWorkData();
    }
  }, [open, mechanic]);

  const loadWorkData = async () => {
    if (!mechanic) return;
    
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const data = await api.getMechanicWork(mechanic.id, {
        from_date: thirtyDaysAgo.toISOString(),
        to_date: new Date().toISOString(),
        status: 'all',
        type: 'all',
        limit: 50,
      });
      
      setWorkData(data);
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('mechanics:work_load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'pending': { variant: 'outline', label: t('repairs:status.pending') },
      'assigned': { variant: 'secondary', label: t('repairs:status.assigned') },
      'in_progress': { variant: 'default', label: t('repairs:status.in_progress') },
      'waiting_parts': { variant: 'secondary', label: t('repairs:status.waiting_parts') },
      'completed': { variant: 'default', label: t('repairs:status.completed') },
      'en_route': { variant: 'default', label: t('repairs:status.en_route') },
      'cancelled': { variant: 'destructive', label: t('repairs:status.cancelled') },
    };
    
    const config = statusMap[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount?: number) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!mechanic) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('mechanics:work_history_title', { name: mechanic.user_name })}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">{t('common:loading')}</div>
          </div>
        ) : workData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{workData.summary.completed_count}</div>
                  <div className="text-sm text-muted-foreground">{t('mechanics:completed_jobs')}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(workData.summary.total_labor)}</div>
                  <div className="text-sm text-muted-foreground">{t('mechanics:total_labor')}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(workData.summary.total_charged)}</div>
                  <div className="text-sm text-muted-foreground">{t('mechanics:total_charged')}</div>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-muted-foreground">
              {t('mechanics:showing_last_days', { days: 30 })}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common:date')}</TableHead>
                    <TableHead>{t('common:type')}</TableHead>
                    <TableHead>{t('mechanics:vehicle')}</TableHead>
                    <TableHead>{t('mechanics:client')}</TableHead>
                    <TableHead>{t('common:status')}</TableHead>
                    <TableHead className="text-right">{t('mechanics:labor_cost')}</TableHead>
                    <TableHead className="text-right">{t('mechanics:total_charged')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {t('mechanics:no_work_found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    workData.items.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell>{formatDate(item.event_date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.type === 'repair' ? t('mechanics:repair') : t('mechanics:express')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.vehicle_info}</TableCell>
                        <TableCell>{item.client_name || '—'}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.labor_cost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_charged)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {workData.page.total_estimate > workData.items.length && (
              <div className="text-sm text-muted-foreground text-center">
                {t('mechanics:showing_items', { 
                  shown: workData.items.length, 
                  total: workData.page.total_estimate 
                })}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
