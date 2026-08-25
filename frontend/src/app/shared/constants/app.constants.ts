// Константи додатку за замовчуванням
export const APP_CONFIG = {
  phoneNumber: '+380984894118', // Номер для toolbar
  phoneNumberForWhatsApp: '380984894118', // без знака +, для toolbar
  developerPhoneNumber: '+380503174280', // Номер розробника для footer
  developerPhoneNumberForWhatsApp: '380503174280', // без знака +, для footer
  facebookUrl: 'https://www.facebook.com/profile.php?id=100063988064019', // URL для toolbar
  developerFacebookUrl: 'https://www.facebook.com/hmv.fermats', // URL для Facebook розробника (footer)
  linkedinUrl: 'https://www.linkedin.com/in/maksym-horielikov-738347275/', // URL для LinkedIn розробника
  logoUrl: 'https://www.geosun.net.ua',
  isServiceStopped: false, // Настройка остановки сервиса: при true все страницы редиректят на /stop-service
  // Базовий URL backend (порожній = той самий origin / proxy). На GitHub Pages — URL ngrok API.
  apiUrl: '',
  hereApiKey: '' // Ключ HERE API для карт/геокодування/маршрутів
};

export type AppConfig = typeof APP_CONFIG;

