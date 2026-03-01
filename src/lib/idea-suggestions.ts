export type IdeaSuggestion = {
  moral: string;
  location: string;
  magicObjectOrMission: string;
};

type IdeaBank = Record<string, IdeaSuggestion[]>;

// Banque locale d'idées très ciblées par thème.
// Clés en minuscule (id ou label simplifié).
export const IDEA_SUGGESTIONS: IdeaBank = {
  pirates: [
    {
      moral: "Le vrai courage, c'est de dire la vérité même quand on a peur.",
      location: "Une île au trésor entourée de récifs en forme de têtes de mort.",
      magicObjectOrMission: "Retrouver une boussole enchantée qui pointe vers ce que l'on désire vraiment, pas seulement vers l'or.",
    },
    {
      moral: "On est plus forts quand on partage que quand on garde tout pour soi.",
      location: "Un vieux navire pirate échoué transformé en cabane secrète.",
      magicObjectOrMission: "Rassembler les quatre morceaux d'une carte au trésor déchirée et cachée dans le bateau.",
    },
    {
      moral: "Même les plus petits peuvent sauver tout un équipage.",
      location: "Une crique cachée accessible seulement à marée basse.",
      magicObjectOrMission: "Délivrer un perroquet messager qui détient le mot de passe du coffre du capitaine.",
    },
  ],
  espace: [
    {
      moral: "La curiosité ouvre des portes vers des mondes incroyables.",
      location: "Une station spatiale en orbite autour d'une planète mystérieuse aux anneaux colorés.",
      magicObjectOrMission: "Retrouver un petit robot-étoile qui s'est perdu en sortant réparer les panneaux solaires.",
    },
    {
      moral: "On n'abandonne pas un ami, même à des années-lumière de chez soi.",
      location: "La surface d'une petite planète recouverte de cristaux lumineux et de cratères profonds.",
      magicObjectOrMission: "Suivre la trace d'une comète pour rapporter un fragment qui sauvera l'énergie du vaisseau familial.",
    },
    {
      moral: "Parfois, la différence de chacun est ce qui sauve la mission.",
      location: "Une école intergalactique flottant au milieu d'un champ d'astéroïdes multicolores.",
      magicObjectOrMission: "Résoudre l'énigme d'un ancien télescope géant qui montre des images du futur.",
    },
  ],
  licornes: [
    {
      moral: "Croire en soi permet de faire apparaître sa propre magie.",
      location: "Une clairière cachée où un arc-en-ciel forme un pont solide.",
      magicObjectOrMission: "Retrouver la corne de lumière d'une licorne qui a perdu ses couleurs.",
    },
    {
      moral: "Les promesses tenues valent plus que tous les sorts du monde.",
      location: "Un lac de nuages sur lequel on marche comme sur un trampoline.",
      magicObjectOrMission: "Réunir trois gouttes de pluie arc-en-ciel pour réveiller l'arbre des licornes.",
    },
  ],
  foret: [
    {
      moral: "Écouter la nature, c'est aussi écouter les autres.",
      location: "Une forêt enchantée où les arbres chuchotent des conseils à qui sait les entendre.",
      magicObjectOrMission: "Suivre la lumière d'une luciole-guide jusqu'à une cabane oubliée remplie de secrets.",
    },
  ],
  dinosaures: [
    {
      moral: "La patience évite bien des catastrophes.",
      location: "Une vallée cachée où vivent des dinosaures géants aux couleurs pastel.",
      magicObjectOrMission: "Protéger un œuf de dinosaure rare jusqu'à son éclosion, malgré une tempête de cendres.",
    },
  ],
};

const THEME_KEYWORDS: Array<{ keywords: string[]; bank: keyof typeof IDEA_SUGGESTIONS }> = [
  { keywords: ['pirat', 'corsaire', 'trésor', 'bateau pirate'], bank: 'pirates' },
  { keywords: ['espace', 'astronaut', 'fusée', 'fusee', 'spatial', 'planète', 'planete', 'galaxie', 'étoile', 'cosmos', 'vaisseau'], bank: 'espace' },
  { keywords: ['licorne', 'unicorn', 'arc-en-ciel'], bank: 'licornes' },
  { keywords: ['forêt', 'foret', 'forêt enchantée', 'bois enchanté'], bank: 'foret' },
  { keywords: ['dino', 'dinosaure', 'tyrannosaure', 'préhistoire', 'jurassique'], bank: 'dinosaures' },
];

export function getIdeasForTheme(theme: string): IdeaSuggestion[] | null {
  const key = theme.trim().toLowerCase();
  if (!key) return null;

  if (IDEA_SUGGESTIONS[key]) return IDEA_SUGGESTIONS[key];

  for (const entry of THEME_KEYWORDS) {
    if (entry.keywords.some((kw) => key.includes(kw))) {
      return IDEA_SUGGESTIONS[entry.bank];
    }
  }

  return null;
}

