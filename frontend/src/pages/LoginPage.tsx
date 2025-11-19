import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { t } = useTranslation(['auth']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch {
      setError(t('auth:invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-end mb-2">
            <LanguageSwitcher />
          </div>
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt={t('auth:title')}
              className="w-32 h-32 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">{t('auth:title')}</CardTitle>
          <CardDescription>
            {t('auth:subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth:email_label')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth:email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth:password_label')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth:password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth:logging_in') : t('auth:login_button')}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>{t('auth:test_credentials')}</p>
            <p className="font-mono text-xs mt-2">
              {t('auth:admin_credentials')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
