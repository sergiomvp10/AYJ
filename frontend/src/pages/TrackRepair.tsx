import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle2, Circle, Clock, Package } from 'lucide-react';

interface RepairTrackingData {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  vehicle_info: string;
  issue_description: string;
  status: string;
  service_type: string;
  location: string;
  mechanic_name?: string;
  mechanic_phone?: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  created_at: string;
  parts: Array<{
    id: string;
    name: string;
    status: string;
    ordered_online: boolean;
    supplier_name?: string;
    estimated_arrival?: string;
    cost?: number;
  }>;
}

export function TrackRepair() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation(['track_repair', 'common']);
  const [repair, setRepair] = useState<RepairTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadRepairData();
      
      const intervalId = setInterval(() => {
        loadRepairData();
      }, 10000);
      
      return () => clearInterval(intervalId);
    }
  }, [token]);

  const loadRepairData = async () => {
    try {
      setLoading(true);
      const data = await api.trackRepairByToken(token!);
      setRepair(data);
    } catch (err) {
      setError(t('track_repair:error.not_found'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: t('track_repair:status.initiated'), icon: CheckCircle2 },
      { key: 'in_progress', label: t('track_repair:status.in_progress'), icon: Clock },
    ];

    if (repair?.status === 'waiting_parts' || (repair?.parts && repair.parts.length > 0)) {
      steps.push({ key: 'waiting_parts', label: t('track_repair:status.waiting_parts'), icon: Package });
    }

    steps.push({ key: 'completed', label: t('track_repair:status.completed'), icon: CheckCircle2 });

    return steps;
  };

  const isStepCompleted = (stepKey: string) => {
    if (!repair) return false;
    
    const statusOrder = ['pending', 'in_progress', 'waiting_parts', 'completed', 'paid'];
    const currentIndex = statusOrder.indexOf(repair.status);
    const stepIndex = statusOrder.indexOf(stepKey);
    
    return stepIndex <= currentIndex;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 text-lg font-semibold">{error || t('track_repair:error.not_found')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('track_repair:title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vehicle Info */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">{t('track_repair:vehicle_info')}</h3>
              <p className="text-gray-900">{repair.vehicle_info}</p>
            </div>

            {/* Issue Description */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">{t('track_repair:issue_description')}</h3>
              <p className="text-gray-900">{repair.issue_description}</p>
            </div>

            {/* Vertical Progress Timeline */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4">{t('track_repair:progress')}</h3>
              <div className="relative">
                {steps.map((step, index) => {
                  const isCompleted = isStepCompleted(step.key);
                  const isLast = index === steps.length - 1;

                  return (
                    <div key={step.key} className="relative pb-8">
                      {/* Vertical Line */}
                      {!isLast && (
                        <div
                          className={`absolute left-0 top-6 w-0.5 h-full ${
                            isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          style={{ marginLeft: '11px' }}
                        />
                      )}

                      {/* Step Circle and Content */}
                      <div className="flex items-start">
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <p
                            className={`font-medium ${
                              isCompleted ? 'text-blue-600' : 'text-gray-600'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mechanic Info */}
            {repair.mechanic_name && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">{t('track_repair:mechanic_assigned')}</h3>
                <p className="text-gray-900">{repair.mechanic_name}</p>
                {repair.mechanic_phone && <p className="text-gray-600 text-sm">{repair.mechanic_phone}</p>}
              </div>
            )}

            {/* Parts Information */}
            {repair.parts.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">{t('track_repair:parts_needed')}</h3>
                <div className="space-y-2">
                  {repair.parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{part.name}</p>
                        {part.supplier_name && (
                          <p className="text-sm text-gray-600">{part.supplier_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            part.status === 'received'
                              ? 'bg-green-100 text-green-800'
                              : part.status === 'ordered'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {t(`track_repair:part_status.${part.status}`)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Information */}
            {repair.cost && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">{t('track_repair:estimated_cost')}</h3>
                <p className="text-2xl font-bold text-gray-900">${repair.cost.toFixed(2)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
