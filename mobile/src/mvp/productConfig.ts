import type { PetSpecies } from './types';

export const productConfig = {
  aiAvatarStyle: {
    description: '真实卡通化，保留真实宠物解剖结构、毛色、五官、眼神和亲和表情。',
    stitchReferenceScreenIds: {
      goldenRetrieverAvatar: '260814984fb74304acec72d1bffe5c02',
      goldenRetrieverPhoto: 'fbbfe4a3c9884652876415d6b6f2440f',
      orangeTabbyAvatar: '1c4315c8b36f474aa0cd9f8a1e0cfe42',
      ragdollAvatar: '88b49d5d0ee846b2acef98dd9adae5a7',
    },
  },
  map: {
    provider: 'amap',
  },
  pet: {
    supportedSpecies: ['dog', 'cat'] as PetSpecies[],
  },
  social: {
    distanceDisplay: 'fuzzy',
    greetingDailyLimit: null as number | null,
  },
};
