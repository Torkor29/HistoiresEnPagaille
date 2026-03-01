/**
 * Thèmes d'histoires préfaites : id, label, icône (emoji) pour l'affichage.
 * Plusieurs synopsis peuvent être stockés par thème en base (PremadeSynopsis).
 */

export const PREMADE_THEMES = [
  { id: 'pirates', label: 'Pirates', icon: '🏴‍☠️' },
  { id: 'espace', label: 'Espace', icon: '🚀' },
  { id: 'licornes', label: 'Licornes', icon: '🦄' },
  { id: 'animaux', label: 'Animaux', icon: '🐾' },
  { id: 'foret', label: 'Forêt enchantée', icon: '🌲' },
  { id: 'magie', label: 'Magie', icon: '✨' },
  { id: 'dinosaures', label: 'Dinosaures', icon: '🦕' },
  { id: 'enquete', label: 'Enquête', icon: '🔍' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'mer', label: 'Mer & océan', icon: '🐠' },
  { id: 'chateau', label: 'Château & chevaliers', icon: '🏰' },
  { id: 'cirque', label: 'Cirque', icon: '🎪' },
  { id: 'savane', label: 'Savane', icon: '🦁' },
  { id: 'robot', label: 'Robots', icon: '🤖' },
  { id: 'cuisine', label: 'Cuisine & gourmandise', icon: '🧁' },
  { id: 'sport', label: 'Sport & olympiades', icon: '🏅' },
  { id: 'musique', label: 'Musique', icon: '🎵' },
  { id: 'jardin', label: 'Jardin & nature', icon: '🌻' },
  { id: 'nuit', label: 'Nuit & étoiles', icon: '🌙' },
  { id: 'avion', label: 'Voyage & avion', icon: '✈️' },
  { id: 'sorciere', label: 'Sorcière bienveillante', icon: '🧙‍♀️' },
  { id: 'dragons', label: 'Dragons', icon: '🐉' },
  { id: 'princesse', label: 'Princesse & royaume', icon: '👑' },
  { id: 'superheros', label: 'Super-héros', icon: '🦸' },
  { id: 'noel', label: 'Noël', icon: '🎄' },
  { id: 'halloween', label: 'Halloween (gentil)', icon: '🎃' },
  { id: 'ecole', label: 'École & amis', icon: '📚' },
  { id: 'campagne', label: 'Campagne & ferme', icon: '🚜' },
  { id: 'montagne', label: 'Montagne & neige', icon: '⛷️' },
  { id: 'plage', label: 'Plage & vacances', icon: '🏖️' },
] as const;

export type PremadeThemeId = (typeof PREMADE_THEMES)[number]['id'];
