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
import expressServiceES from './locales/es/express_service.json';
import publicFormES from './locales/es/public_form.json';
import repairRequestsES from './locales/es/repair_requests.json';
import toastsES from './locales/es/toasts.json';
import vinES from './locales/es/vin.json';

import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import repairsEN from './locales/en/repairs.json';
import partsEN from './locales/en/parts.json';
import clientsEN from './locales/en/clients.json';
import mechanicsEN from './locales/en/mechanics.json';
import workshopsEN from './locales/en/workshops.json';
import authorizedPointsEN from './locales/en/authorized_points.json';
import expressServiceEN from './locales/en/express_service.json';
import publicFormEN from './locales/en/public_form.json';
import repairRequestsEN from './locales/en/repair_requests.json';
import toastsEN from './locales/en/toasts.json';
import vinEN from './locales/en/vin.json';

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
    express_service: expressServiceES,
    public_form: publicFormES,
    repair_requests: repairRequestsES,
    toasts: toastsES,
    vin: vinES,
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
    express_service: expressServiceEN,
    public_form: publicFormEN,
    repair_requests: repairRequestsEN,
    toasts: toastsEN,
    vin: vinEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['en', 'es'],
    fallbackLng: 'es',
    ns: ['common', 'auth', 'dashboard', 'repairs', 'parts', 'clients', 'mechanics', 'workshops', 'authorized_points', 'express_service', 'public_form', 'repair_requests', 'toasts', 'vin'],
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
