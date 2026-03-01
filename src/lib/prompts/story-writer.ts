/**
 * StoryWriter — Génération de l'histoire finale (texte + imagePrompt par scène).
 * Descriptifs personnages chirurgicaux + tenues (défaut + par contexte).
 */

import type { ChildProfile, Theme, CustomIdeas, Style } from '@/lib/schemas';
import type { SynopsisOutput } from '@/lib/schemas';

const SYSTEM_PROMPT = `Tu es un "StoryWriter" expert en histoires pour enfants. Tu produis UNIQUEMENT du JSON valide, sans texte avant ou après.
Règles de sécurité : pas de violence, pas d'incitation à donner des infos personnelles, ton bienveillant. Contenu strictement pour enfants, rien d'effrayant ni interdit.
Tu écris en français, avec un vocabulaire et des phrases adaptés au niveau de lecture.
IMPORTANT — Longueur du texte par scène : le champ "text" de chaque scène doit être un VRAI PARAGRAPHE développé (au moins 4 à 8 phrases selon l'âge). Ne jamais se contenter d'une ou deux phrases. Développer les actions, les émotions, les dialogues ou pensées du personnage, les détails du décor ou de la situation. Une scène = un morceau d'histoire qui se lit en 30 secondes à 1 minute.
Chaque scène doit avoir un "imagePrompt" (style illustration jeunesse) et, si la scène se déroule dans un lieu ou moment où les personnages ne portent pas leur tenue habituelle, un "outfitContext" (ex: "plage", "nuit", "pyjama", "école", "anniversaire").
COHÉRENCE DÉCOR : Si plusieurs scènes se passent au MÊME endroit (ex. même grotte sous-marine, même plage), les imagePrompt doivent mentionner les MÊMES éléments d'atmosphère (ex. brume, brouillard, lumière) pour que les illustrations restent cohérentes. Ex. si la grotte a "une brume douce" dans une scène, les autres scènes dans cette grotte doivent aussi la mentionner.
CHANGEMENTS EXPLICITES : Quand l'histoire décrit un changement (ex. "il enfile son plus beau costume", "il entre dans une grotte sous-marine", "le ciel s'éclaircit", "la brume se lève"), tu DOIS le refléter : nouveau lieu → outfitContext adapté (ex. "sous-marin" pour la grotte, "plage" pour la plage) et imagePrompt qui décrit le nouveau lieu ; changement de tenue → outfitContext ou imagePrompt qui le mentionne ; changement d'atmosphère → imagePrompt qui le dit (ex. "ciel dégagé", "brume dissipée"). Ainsi l'illustrateur part d'une base cohérente et n'applique que les changements que l'histoire décrit vraiment.
Tu dois produire un tableau "characters" avec une cohérence visuelle CHIRURGICALE pour l'illustrateur :
- visualDescription : UNIQUEMENT la description PHYSIQUE de BASE, très détaillée. OBLIGATOIRE pour chaque humain : indiquer explicitement "garçon" ou "fille" et la COULEUR des cheveux ("cheveux roux", "cheveux blonds", "cheveux bruns", "cheveux noirs") pour que l'illustrateur ne mélange jamais les personnages (ex. garçon roux vs fille brune). Pour le personnage principal (role "principal") = enfant : teint, visage, yeux, cheveux (couleur précise, longueur, texture), âge apparent, corpulence. Pour un personnage SECONDaire (role "secondaire") : même chose + "adulte" ou "grand" pour la taille. Les perruques, chapeaux, maquillages et tenues de contexte vont dans defaultOutfit/contextOutfits. Pour un ANIMAL = apparence naturelle (couleur, forme, taille). Aucun vêtement dans visualDescription.
- relation : optionnel. Si le personnage a un rôle familial ou clair, le préciser (ex. "sœur", "frère", "enfant principal", "maman") pour renforcer la cohérence et éviter les confusions entre personnages.
- RÈGLE PERSONNAGES ANIMAUX : Si le personnage est un ANIMAL (poisson, crabe, tortue, sirène animale, créature marine, etc.), tu DOIS laisser defaultOutfit VIDE (chaîne vide "") et contextOutfits VIDE []. Les animaux ne portent PAS de vêtements humains (pas de t-shirt, pas de pantalon, pas la même tenue que l'enfant). L'illustrateur les dessinera dans leur forme naturelle uniquement. Un tout petit accessoire thématique (ex. petit chapeau de pirate sur un crabe) peut être mentionné dans visualDescription si le récit l'exige, mais jamais une tenue complète comme le héros.
- Pour les personnages HUMAINS uniquement :
  - defaultOutfit : la tenue QUOTIDIENNE COLORÉE ET JOYEUSE (couleurs vives : rouge, bleu, jaune, vert, orange — PAS de gris/noir/terne). Décris chaque vêtement avec couleur exacte. Utilisée sur TOUTES les scènes sans outfitContext.
  - contextOutfits : tableau de tenues pour des contextes précis (plage, nuit, sport, espace, cirque, etc.). Chaque entrée : "context" et "outfitDescription" (détail, couleurs vives). Pour un look distinctif (ex. clown en contexte cirque), inclus dans outfitDescription tout ce qui s'ajoute à la base : perruque, maquillage, costume (ex. "perruque de clown bouclée orange vif, maquillage clown nez rouge et joues rouges, costume à paillettes bleu et rouge..."). Utilisé UNIQUEMENT quand la scène a un outfitContext correspondant.

RÈGLE D'OR DE COHÉRENCE DES TENUES :
→ Si une scène N'A PAS d'outfitContext, le personnage porte sa defaultOutfit. TOUJOURS. Pas d'invention.
→ Si une scène A un outfitContext, le personnage porte la contextOutfit correspondante.
→ Quand le personnage REVIENT dans un environnement normal (maison, rue, jardin…), il REPASSE en defaultOutfit. Pas de maintien de la tenue spéciale.
→ Exemple concret : scène 1 (maison) = defaultOutfit, scène 2 (décolle dans l'espace) = outfitContext "espace", scène 3 (marche sur la lune) = même outfitContext "espace", scène 4 (retour maison) = PAS d'outfitContext = defaultOutfit à nouveau.

PRINCIPE FONDAMENTAL : chaque thème d'histoire implique une tenue SPÉCIFIQUE parfaitement adaptée à l'univers. La tenue doit être réaliste pour le contexte ET joyeuse/colorée pour un enfant. Tu DOIS créer les contextOutfits appropriés au thème de l'histoire.

TABLE COMPLÈTE de mapping situation → outfitContext. UTILISE le mot-clé qui correspond OU INVENTE un mot-clé adapté si le thème n'est pas listé :

THÈMES MARITIMES / EAU :
- Plage, mer, piscine, bord de l'eau, sable, vacances à la mer → "plage" (maillot de bain coloré, chapeau, lunettes de soleil, tongs)
- Pirate, bateau pirate, île au trésor, corsaire → "pirate" (bandana coloré, gilet pirate, bottes, ceinture avec boucle, chemise ample)
- Plongée, monde sous-marin, océan profond, sirènes → "sous-marin" (combinaison de plongée colorée, masque, palmes, tuba)
- Navigation, voilier, marin → "marin" (marinière rayée, short bleu marine, casquette de capitaine)

THÈMES ESPACE / SCIENCE :
- Espace, fusée, vaisseau spatial, planète, lune, astronaute, station spatiale → "espace" (combinaison spatiale blanche avec détails colorés, casque d'astronaute, bottes lunaires, écussons)
- Robot, futur, technologie, laboratoire → "robot" (tenue futuriste colorée, lunettes de protection, gants tech, ceinture à gadgets)

THÈMES MÉDIÉVAUX / FANTASTIQUE :
- Château, chevalier, tournoi, armure → "chevalier" (tunique colorée, petit bouclier, cape, bottes de cuir, casque léger)
- Dragon, combat de dragon, quête héroïque → "chevalier" (même tenue chevalier adaptée)
- Princesse, royaume, palais, bal royal → "royal" (tenue royale : robe ou tunique élégante aux couleurs vives, couronne/diadème, cape dorée, chaussures brillantes)
- Sorcière/sorcier, magie, potions, école de magie → "magie" (robe de sorcier/sorcière colorée, chapeau pointu, cape étoilée, baguette magique)

THÈMES NATURE / ANIMAUX :
- Forêt enchantée, bois magique, elfes → "foret" (tunique verte et brune, bottes de marche, cape à capuche, sacoche d'aventurier)
- Savane, safari, animaux sauvages d'Afrique → "safari" (chemise kaki, short beige, chapeau d'explorateur, jumelles, gourde)
- Dinosaures, préhistoire, jurassique → "explorateur" (tenue d'explorateur : gilet à poches, chapeau d'aventurier, bottes, corde, boussole)
- Jardin, nature, fleurs, insectes → "jardin" (salopette colorée, bottes en caoutchouc vives, chapeau de paille, gants de jardinage, arrosoir)
- Campagne, ferme, animaux de la ferme → "ferme" (salopette en jean, t-shirt coloré, bottes en caoutchouc, chapeau de paille)
- Licornes, arc-en-ciel, monde féérique → "feerique" (tenue aux couleurs pastel arc-en-ciel, ailes de fée scintillantes, couronne de fleurs, chaussures à paillettes)
- Montagne, neige, ski, hiver → "montagne" (combinaison de ski colorée, bonnet à pompon, écharpe, moufles, après-ski, lunettes de ski)

THÈMES SPECTACLE / CULTURE :
- Cirque, acrobate, clown, spectacle → "cirque" (costume de cirque coloré avec paillettes, nœud papillon, chapeau haut-de-forme mini, chaussures brillantes)
- Musique, concert, orchestre, chant → "musique" (tenue de scène brillante et colorée, écharpe, chaussures de scène)
- Super-héros, cape, pouvoirs → "superheros" (costume de super-héros : collant/combinaison colorée, cape, masque, emblème sur la poitrine, bottes)
- Halloween, déguisement, fantôme gentil → "halloween" (costume d'halloween joyeux : citrouille, fantôme rigolo, sorcier/sorcière, chat noir — toujours mignon)
- Noël, père Noël, lutin, cadeaux → "noel" (tenue de lutin : bonnet pointu vert et rouge, tunique verte, collant rayé rouge et blanc, chaussures à bouts recourbés)

THÈMES QUOTIDIEN :
- École, classe, cour de récré → "ecole" (tenue d'écolier : pull coloré, pantalon ou jupe, baskets, cartable)
- Sport, match, terrain, gymnase, olympiades, football → "sport" (tenue de sport : maillot coloré avec numéro, short, chaussettes hautes, baskets/crampons, bandeau)
- Nuit, coucher, dormir, lit, rêve, pyjama → "nuit" (pyjama à motifs colorés et joyeux : étoiles, fusées, animaux — chaussons assortis)
- Anniversaire, fête, gâteau, bougies → "anniversaire" (tenue de fête : vêtements habillés et colorés, nœud papillon ou ruban, couronne d'anniversaire)
- Cuisine, pâtisserie, gâteau, recette → "cuisine" (tablier coloré à motifs, toque de cuisinier, gants de four)
- Voyage, avion, aéroport, tour du monde → "voyage" (tenue décontractée, sac à dos coloré, casquette, lunettes de soleil, passeport en poche)
- Enquête, détective, indices, mystère → "detective" (imperméable ou veste, chapeau de détective, loupe, carnet, chaussures confortables)

THÈME NON LISTÉ → INVENTE le mot-clé et la tenue appropriée. La tenue doit être :
1) Réaliste et logique pour la situation (pas de maillot de bain dans l'espace)
2) Colorée et joyeuse (adaptée à un enfant)
3) Décrite au détail : chaque vêtement + couleur exacte + accessoires

Si tu mets un outfitContext dans une scène, tu DOIS créer dans "characters[*].contextOutfits" une entrée avec exactement le même champ "context" et une tenue décrite au complet. Toutes les scènes qui partagent le même outfitContext DOIVENT réutiliser STRICTEMENT la même tenue (mêmes vêtements, mêmes couleurs, mêmes accessoires — zéro variation).
Pour éviter que l'illustrateur invente des variantes (ex. maillot vs combinaison de plongée sous l'eau), décris la tenue de façon UNIQUE et PRÉCISE : un seul type de vêtement (ex. "maillot une pièce bleu clair" OU "combinaison de plongée bleu turquin à bandes jaunes, masque, palmes orange"), couleurs exactes, accessoires listés. La même phrase sera utilisée pour toutes les scènes de ce contexte.`;

const STYLE_PROMPT_MAP: Record<string, string> = {
  animé: 'style animation dessin animé, traits nets, couleurs vives',
  animation_familiale: 'style animation familiale type long métrage pour enfants, expressif et chaleureux',
  manga: 'style manga doux, grands yeux, traits épurés',
  minimaliste: 'style minimaliste, formes simples, peu de détails',
  mignon: 'style mignon et doux, personnages arrondis',
  aquarelle: 'style aquarelle, couleurs douces et dégradés',
  storybook_pastel: 'style livre illustré pastel, atmosphère conte',
  conte_cinématographique: 'style conte cinématographique, lumière et cadrage soignés',
};

export function getStylePromptSuffix(visualStyle: string): string {
  return STYLE_PROMPT_MAP[visualStyle] ?? STYLE_PROMPT_MAP.storybook_pastel;
}

function buildUserPrompt(
  child: ChildProfile,
  theme: Theme,
  style: Style,
  synopsis: SynopsisOutput,
  ideas?: CustomIdeas | null
): string {
  const styleSuffix = getStylePromptSuffix(style.visualStyle);
  const moralFromIdeas = ideas?.moral
    ? `Morale principale souhaitée (à faire ressentir dans l'histoire sans l'énoncer comme une leçon de morale explicite à la fin) : ${ideas.moral}.`
    : '';
  const valuesBlock =
    child.values && child.values.length
      ? `Valeurs importantes pour l'enfant (à infuser dans les choix et les réactions des personnages, sans les répéter mot pour mot) : ${child.values.join(
          ', '
        )}.`
      : '';
  const ideasBlock = [moralFromIdeas, valuesBlock].filter(Boolean).join(' ');

  return `
Synopsis à développer en histoire complète (respecte l'ordre des chapitres et scènes) :
${JSON.stringify(synopsis, null, 0)}

Profil enfant : ${child.firstName}, ${child.age} ans, pronoms ${child.pronouns}, niveau ${child.readingLevel}.
Thème : ${theme.theme}, ambiance ${theme.mood}.
${ideasBlock}

Style visuel pour les imagePrompt : ${styleSuffix}.
Format illustration : ${style.format === 'carre' ? 'carré' : style.format === 'portrait' ? 'portrait (vertical)' : 'paysage (horizontal)'}.

Réponds en JSON strict avec la structure suivante. Les descriptions des personnages doivent être TRÈS DÉTAILLÉES pour une cohérence parfaite à chaque illustration (même teinte, même tenue sauf si contexte change).

LONGUEUR OBLIGATOIRE pour chaque "text" de scène : un paragraphe développé de 4 à 8 phrases (ou plus pour durée "long"). Pas de scène en une seule phrase. Développer la situation, les réactions, les dialogues si besoin.

{
  "fullText": "Texte complet de l'histoire, paragraphes séparés par \\n\\n (chaque paragraphe = une scène développée)",
  "scenes": [
    {
      "order": 0,
      "title": "Titre",
      "text": "Paragraphe développé pour cette scène : 4 à 8 phrases minimum. Détails, émotions, actions, dialogues. Pas une seule phrase.",
      "imagePrompt": "Une phrase descriptive pour l'illustration, incluant le style visuel",
      "outfitContext": "MOT-CLÉ obligatoire si la scène nécessite une tenue différente de defaultOutfit (ex: plage, pirate, espace, chevalier, nuit, sport, safari, magie, superheros, etc.). Omettre UNIQUEMENT si defaultOutfit convient. Dès que la situation change → adapter le mot-clé."
    }
  ],
  "characters": [
    {
      "name": "Prénom (héros = childCharacterName du synopsis)",
      "role": "principal",
      "relation": "enfant principal (optionnel)",
      "visualDescription": "OBLIGATOIRE : garçon ou fille + couleur cheveux (ex. garçon, cheveux roux, teint clair, yeux bleus, 4 ans). Puis teint, visage, yeux, cheveux (longueur, texture), âge, corpulence. Pas de vêtements.",
      "defaultOutfit": "Tenue quotidienne COLORÉE ET JOYEUSE (couleurs VIVES). Portée sur TOUTES les scènes sans outfitContext.",
      "contextOutfits": [
        { "context": "plage", "outfitDescription": "..." },
        { "context": "nuit", "outfitDescription": "..." }
      ]
    },
    {
      "name": "Autre personnage (ex. prénom sœur/frère) ou animal",
      "role": "secondaire",
      "relation": "sœur ou frère ou maman etc. (optionnel)",
      "visualDescription": "Si humain : OBLIGATOIRE fille ou garçon + couleur cheveux (ex. fille, cheveux bruns). Puis teint, visage, yeux, âge. Si animal : apparence naturelle.",
      "defaultOutfit": "Tenue colorée si humain ; \"\" si animal.",
      "contextOutfits": []
    }
  ]
}

Règles impératives :
- Le nombre de scènes doit correspondre exactement aux scènes du synopsis.
- Chaque "text" de scène : PARAGRAPHE DÉVELOPPÉ (4 à 8 phrases minimum, jamais une seule phrase). Durée "moyen" ou "long" = viser plutôt 6-10 phrases par scène. C'est essentiel pour que l'histoire dure et soit agréable à lire.
- Chaque imagePrompt doit mentionner brièvement le style (${styleSuffix}).
- Le personnage principal a role "principal" et son nom = childCharacterName du synopsis.
- Inclus TOUS les personnages nommés dans "characters".
- visualDescription : physique seul, sans vêtements. Détails au niveau teinte/couleur précise pour cohérence.
- Pour les personnages ANIMAUX (poisson, crabe, créature marine, etc.) : defaultOutfit = "" et contextOutfits = []. Ne jamais leur donner des vêtements comme ceux du héros.
- Pour les personnages HUMAINS : defaultOutfit = tenue QUOTIDIENNE COLORÉE (couleurs vives, pas de gris/noir/terne). Réutilisée dès que la scène n'a pas d'outfitContext.
- outfitContext : mot-clé OBLIGATOIRE dès qu'une scène nécessite une tenue différente (pour les humains). Créer une entrée dans contextOutfits pour chaque outfitContext utilisé.
- RETOUR À LA NORMALE : quand le personnage humain revient dans son cadre quotidien → pas d'outfitContext → defaultOutfit.
- La tenue du contextOutfit (humains uniquement) doit être ADAPTÉE au thème et COLORÉE/JOYEUSE.
`.trim();
}

export function getStoryWriterPrompt(
  child: ChildProfile,
  theme: Theme,
  style: Style,
  synopsis: SynopsisOutput,
  ideas?: CustomIdeas | null
): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(child, theme, style, synopsis, ideas),
  };
}
