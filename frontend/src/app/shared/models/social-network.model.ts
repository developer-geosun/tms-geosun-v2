// Типи та інтерфейси для соціальних мереж
export type SocialNetworkType = 'telegram' | 'whatsapp' | 'viber' | 'facebook' | 'linkedin';

export interface SocialNetwork {
  type: SocialNetworkType;
  url: string;
  title: string;
  icon: string;
}

