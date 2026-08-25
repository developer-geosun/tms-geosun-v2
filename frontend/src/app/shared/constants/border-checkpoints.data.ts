export interface BorderCheckpoint {
  name: Record<'uk' | 'ru' | 'en', string>;
  lat: number;
  lng: number;
}

export const CHECKPOINTS_DATA: Record<string, BorderCheckpoint[]> = {
  pl: [
    { name: { uk: 'Ягодин', ru: 'Ягодин', en: 'Yahodyn' }, lat: 51.18836, lng: 23.81061 },
    { name: { uk: 'Краківець', ru: 'Краковец', en: 'Krakovets' }, lat: 49.955, lng: 23.11695 },
    { name: { uk: 'Шегині', ru: 'Шегини', en: 'Shehyni' }, lat: 49.79938, lng: 22.9517 },
    { name: { uk: 'Рава-Руська', ru: 'Рава-Русская', en: 'Rava-Ruska' }, lat: 50.27301, lng: 23.59123 }
  ],
  sk: [{ name: { uk: 'Ужгород', ru: 'Ужгород', en: 'Uzhhorod' }, lat: 48.612, lng: 22.257 }],
  hu: [
    { name: { uk: 'Чоп (Тиса)', ru: 'Чоп (Тиса)', en: 'Chop (Tysa)' }, lat: 48.4286, lng: 22.1764 },
    { name: { uk: 'Лужанка', ru: 'Лужанка', en: 'Luzhanka' }, lat: 48.1678, lng: 22.5855 }
  ],
  ro: [
    { name: { uk: 'Порубне', ru: 'Порубное', en: 'Porubne' }, lat: 47.985, lng: 26.0592 },
    { name: { uk: 'Дякове', ru: 'Дьяково', en: 'Diakove' }, lat: 48.0165, lng: 23.013 }
  ],
  md: [
    { name: { uk: 'Паланка', ru: 'Паланка', en: 'Palanka' }, lat: 46.4117, lng: 30.1583 },
    { name: { uk: 'Могилів-Подільський', ru: 'Могилев-Подольский', en: 'Mohyliv-Podilskyi' }, lat: 48.4418, lng: 27.7852 }
  ]
};
