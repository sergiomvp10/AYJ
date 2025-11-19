import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
    document.documentElement.lang = lng;
  };

  const currentLanguage = i18n.language.startsWith('es') ? 'es' : 'en';

  return (
    <Select value={currentLanguage} onValueChange={changeLanguage}>
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="es">ES</SelectItem>
        <SelectItem value="en">EN</SelectItem>
      </SelectContent>
    </Select>
  );
}
