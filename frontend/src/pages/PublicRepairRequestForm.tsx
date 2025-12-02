import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

export default function PublicRepairRequestForm() {
  const { t, i18n } = useTranslation(['public_form', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const isEnglishRoute = location.pathname.includes('/schedule') || location.pathname.includes('/request');
    const targetLang = isEnglishRoute ? 'en' : 'es';
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle_info: '',
    description: '',
    service_type: 'mobile',
    location: '',
    preferred_date: '',
    preferred_time: '',
    is_emergency: false,
  });

  const [vin, setVin] = useState('');
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinError, setVinError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDecodeVin = async () => {
    if (!vin.trim()) {
      return;
    }

    setIsDecodingVin(true);
    setVinError('');

    try {
      const response = await api.decodeVin(vin.trim());
      
      if (response.make && response.model_year) {
        const parts = [response.make];
        if (response.model) {
          parts.push(response.model);
        }
        parts.push(response.model_year);
        const vehicleInfo = parts.join(' ');
        setFormData({ ...formData, vehicle_info: vehicleInfo });
      } else {
        setVinError(t('public_form:form.vin_error'));
      }
    } catch (error) {
      setVinError(t('public_form:form.vin_error'));
    } finally {
      setIsDecodingVin(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('public_form:errors.required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('public_form:errors.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('public_form:errors.invalid_email');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('public_form:errors.required');
    }

    if (!formData.vehicle_info.trim()) {
      newErrors.vehicle_info = t('public_form:errors.required');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('public_form:errors.required');
    }

    if (!formData.location.trim()) {
      newErrors.location = t('public_form:errors.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let preferred_datetime: string | undefined;
      if (formData.preferred_date && formData.preferred_time) {
        preferred_datetime = `${formData.preferred_date}T${formData.preferred_time}:00`;
      }

      const response = await api.createPublicRepairRequest({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        vehicle_info: formData.vehicle_info.trim(),
        description: formData.description.trim(),
        service_type: formData.service_type,
        location: formData.location.trim(),
        preferred_datetime,
        is_emergency: formData.is_emergency,
      });

      setReferenceId(response.id);
      setSubmitted(true);
    } catch (err: any) {
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        setError(t('public_form:errors.rate_limit'));
      } else {
        setError(t('public_form:errors.submit_error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('public_form:success.title')}
          </h1>
          <p className="text-gray-600 mb-4">
            {t('public_form:success.message')}
          </p>
          <div className="bg-gray-50 rounded p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">
              {t('public_form:success.reference')}
            </p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {referenceId.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full">
            {t('public_form:buttons.back_home')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('public_form:title')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('public_form:subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newLang = i18n.language === 'es' ? 'en' : 'es';
                i18n.changeLanguage(newLang);
                navigate(newLang === 'en' ? '/request' : '/solicitar');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              {i18n.language === 'es' ? 'EN' : 'ES'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">{t('public_form:form.name_label')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('public_form:form.name_placeholder')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email">{t('public_form:form.email_label')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('public_form:form.email_placeholder')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone">{t('public_form:form.phone_label')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('public_form:form.phone_placeholder')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="service_type">{t('public_form:form.service_type_label')}</Label>
                <select
                  id="service_type"
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="mobile">{t('public_form:form.service_mobile')}</option>
                  <option value="workshop">{t('public_form:form.service_workshop')}</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="vin">{t('public_form:form.vin_label')}</Label>
              <div className="flex gap-2">
                <Input
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder={t('public_form:form.vin_placeholder')}
                  maxLength={17}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleDecodeVin}
                  disabled={!vin.trim() || isDecodingVin}
                  variant="outline"
                >
                  {isDecodingVin ? t('public_form:form.vin_decoding') : t('public_form:form.vin_decode_button')}
                </Button>
              </div>
              {vinError && <p className="text-sm text-red-600 mt-1">{vinError}</p>}
            </div>

            <div>
              <Label htmlFor="vehicle_info">{t('public_form:form.vehicle_label')}</Label>
              <Input
                id="vehicle_info"
                value={formData.vehicle_info}
                onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                placeholder={t('public_form:form.vehicle_placeholder')}
                className={errors.vehicle_info ? 'border-red-500' : ''}
              />
              {errors.vehicle_info && <p className="text-sm text-red-600 mt-1">{errors.vehicle_info}</p>}
            </div>

            <div>
              <Label htmlFor="description">{t('public_form:form.description_label')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('public_form:form.description_placeholder')}
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
            </div>

            <div>
              <Label htmlFor="location">{t('public_form:form.location_label')}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('public_form:form.location_placeholder')}
                className={errors.location ? 'border-red-500' : ''}
              />
              {errors.location && <p className="text-sm text-red-600 mt-1">{errors.location}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="preferred_date">{t('public_form:form.preferred_date_label')}</Label>
                <Input
                  id="preferred_date"
                  type="date"
                  value={formData.preferred_date}
                  onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="preferred_time">{t('public_form:form.preferred_time_label')}</Label>
                <Input
                  id="preferred_time"
                  type="time"
                  value={formData.preferred_time}
                  onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_emergency"
                checked={formData.is_emergency}
                onCheckedChange={(checked) => setFormData({ ...formData, is_emergency: checked as boolean })}
              />
              <div>
                <Label htmlFor="is_emergency" className="cursor-pointer">
                  {t('public_form:form.is_emergency_label')}
                </Label>
                <p className="text-sm text-gray-500">
                  {t('public_form:form.is_emergency_help')}
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('public_form:buttons.submitting') : t('public_form:buttons.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
