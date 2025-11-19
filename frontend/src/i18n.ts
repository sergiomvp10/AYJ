import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonES from './locales/es/common.json';
import authES from './locales/es/auth.json';
import dashboardES from './locales/es/dashboard.json';
import repairsES from './locales/es/repairs.json';
import partsES from './locales/es/parts.json';
import clientsES from './locales/es/clients.json';
import mechanicsES from './locales/es/mechanics.json';
import workshopsES from './locales/es/workshops.json';
import authorizedPointsES from './locales/es/authorized_points.json';
import toastsES from './locales/es/toasts.json';

import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import repairsEN from './locales/en/repairs.json';
import partsEN from './locales/en/parts.json';
import clientsEN from './locales/en/clients.json';
import mechanicsEN from './locales/en/mechanics.json';
import workshopsEN from './locales/en/workshops.json';
import authorizedPointsEN from './locales/en/authorized_points.json';
import toastsEN from './locales/en/toasts.json';

const resources = {
  es: {
    common: commonES,
    auth: authES,
    dashboard: dashboardES,
    repairs: repairsES,
    parts: partsES,
    clients: clientsES,
    mechanics: mechanicsES,
    workshops: workshopsES,
    authorized_points: authorizedPointsES,
    toasts: toastsES,
  },
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
    repairs: repairsEN,
    parts: partsEN,
    clients: clientsEN,
    mechanics: mechanicsEN,
    workshops: workshopsEN,
    authorized_points: authorizedPointsEN,
    toasts: toastsEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'es'],
    fallbackLng: 'es',
    ns: ['common', 'auth', 'dashboard', 'repairs', 'parts', 'clients', 'mechanics', 'workshops', 'authorized_points', 'toasts'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
