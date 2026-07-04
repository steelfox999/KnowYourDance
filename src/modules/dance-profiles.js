const DANCE_PROFILES = {
  'somana-kunitha': {
    subtitle: 'Dance of the Guardian Village Spirits',
    region: 'Karnataka (Mandya, Hassan & Mysuru)',
    materials: 'Carved red cedar wood and silk costumes',
    instruments: 'Tamate frame drum, Are, and brass Kamsale',
    maskPath: '/assets/masks/somana_kunitha.jpg',
    description:
      'Somana Kunitha is an ancient ritual folk dance performed in the river basins of Southern Karnataka during village festivals. Dancers wear massive carved wooden masks representing divine guardians who safeguard the community.',
    maskLore:
      'The masks are sculpted with detailed deity crowns, wide expressive eyes, and vivid yellow and saffron pigments. Worshipped before every performance, the dancer enters a heightened ritual state through rhythmic spinning and drumming.',
  },
  chau: {
    subtitle: 'Martial Acrobatics & Epic Heroism',
    region: 'Purulia (West Bengal), Odisha & Jharkhand',
    materials: 'Paper-mache, clay, peacock feathers, and metallic beads',
    instruments: 'Dhamsa, Dhol, and Shehnai pipes',
    maskPath: '/assets/masks/chau.jpg',
    description:
      'Purulia Chau is a heroic martial mask dance where dancers enact stories from the Ramayana, Mahabharata, and Puranas through acrobatic leaps, martial stances, and dramatic theatrical movement.',
    maskLore:
      'Crafted by master artisans in Charida, Chau masks feature majestic crowns, radiant highlights, and regal expressions of gods, warriors, and mythic heroes.',
  },
  'bardo-chham': {
    subtitle: 'Dance of the Himalayan Animal Avatars',
    region: 'West Kameng, Arunachal Pradesh',
    materials: 'Lightweight carved alpine wood and silk brocades',
    instruments: 'Tibetan cymbals, wooden gongs, and horns',
    maskPath: '/assets/masks/bardo_chham.jpg',
    description:
      'Bardo Chham is a sacred folk dance of the Sherdukpen community. The dance portrays a cosmic battle between guardian virtues and disruptive spirits represented by wild animal avatars.',
    maskLore:
      'Dancers wear colorful wooden masks representing animals and mythical beings. The performance uses rhythmic movement to drive out negative energies from mountain villages.',
  },
  gomira: {
    subtitle: 'The Shamanic Deity Incarnation',
    region: 'North & South Dinajpur, West Bengal',
    materials: 'Sacred Gamhar wood and organic plant dyes',
    instruments: 'Dhak drum and bronze Kansi gong',
    maskPath: '/assets/masks/gomira.jpg',
    description:
      'Gomira is a ritual dance from rural Dinajpur. Dancers wear hand-carved wooden deity masks to invoke protective forces and banish darkness from the community.',
    maskLore:
      'Hand-carved Gomira masks possess intense deity features. When the mask touches the dancer, tradition holds that the deity temporarily inhabits the performance.',
  },
};

export function getDanceProfile(id) {
  return DANCE_PROFILES[id] || DANCE_PROFILES['somana-kunitha'];
}
