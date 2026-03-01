/**
 * StoryPlanner — Génération du synopsis structuré (JSON).
 * Prompts en français, sortie validée par zod.
 */

import type { ChildProfile, Theme, CustomIdeas } from '@/lib/schemas';

const SYSTEM_PROMPT = `Tu es un "StoryPlanner" expert en histoires pour enfants. Tu produis UNIQUEMENT du JSON valide, sans texte avant ou après.
Règles de sécurité (OBLIGATOIRES) :
- Pas de violence graphique, pas de contenu effrayant inadapté à l'âge.
- Ne jamais encourager l'enfant à donner des informations personnelles (adresse, école, etc.).
- Pas de contenu à caractère sexuel ou haineux.
- Ton bienveillant et adapté à la jeunesse.
Contraintes créatives :
- Langage et longueur adaptés à l'âge et au niveau de lecture indiqués.
- Intégrer les centres d'intérêt et valeurs demandés.
- Éviter strictement les thèmes/sujets listés dans "à éviter".
- Chaque chapitre contient des "scènes" avec un résumé et des "visualBeats" (moments forts pour l'illustration).`;

function buildUserPrompt(
  child: ChildProfile,
  theme: Theme,
  ideas?: CustomIdeas | null
): string {
  const avoidList = child.avoid?.length ? `À ÉVITER absolument : ${child.avoid.join(', ')}.` : '';
  const valuesList = child.values?.length ? `Valeurs à transmettre : ${child.values.join(', ')}.` : '';
  const ideasBlock = ideas
    ? `
Personnages secondaires ou idées : ${ideas.secondaryCharacters || 'non précisé'}
Lieu : ${ideas.location || 'non précisé'}
Objet magique / mission : ${ideas.magicObjectOrMission || 'non précisé'}
Morale souhaitée : ${ideas.moral || 'non précisé'}
Mots de vocabulaire à inclure : ${ideas.vocabulary?.length ? ideas.vocabulary.join(', ') : 'aucun'}
`
    : '';

  return `
Profil de l'enfant héros :
- Prénom : ${child.firstName}
- Âge : ${child.age} ans
- Pronoms : ${child.pronouns}
- Centres d'intérêt : ${child.interests.join(', ')}
- Niveau de lecture : ${child.readingLevel}
${avoidList}
${valuesList}

Thème de l'histoire : ${theme.theme}
Ambiance : ${theme.mood}
Durée cible : ${theme.duration} (${theme.duration === 'court' ? '3-5 min' : theme.duration === 'moyen' ? '7-10 min' : '12-15 min'})
${ideasBlock}

Génère un synopsis au format JSON strict avec la structure suivante (pas d'autre texte) :
{
  "title": "Titre de l'histoire",
  "childCharacterName": "${child.firstName}",
  "moral": "une phrase optionnelle",
  "chapters": [
    {
      "title": "Titre du chapitre",
      "scenes": [
        {
          "title": "Titre de la scène",
          "summary": "Résumé développé de la scène (4-6 phrases : situation, actions, rebondissement ou émotion) pour permettre un paragraphe riche au texte final",
          "visualBeats": [
            { "sceneIndex": 0, "description": "Description visuelle pour l'illustration", "mood": "optionnel" }
          ]
        }
      ]
    }
  ],
  "safetyChecklist": ["point 1", "point 2"]
}
Nombre de chapitres : 2 à 4 selon la durée. Scènes : 8 à 14 au total pour que l'histoire ait de la longueur. Chaque "summary" de scène doit être développé (4-6 phrases) pour que le texte final de chaque scène soit un vrai paragraphe. VisualBeats : au moins un par scène.
La morale proposée doit être spécifique au thème "${theme.theme}" et aux valeurs/contraintes ci-dessus, pas une phrase trop générique. Varie vraiment les lieux, les rebondissements et le ton par rapport aux synopsis les plus évidents pour ce thème.
`.trim();
}

export function getStoryPlannerPrompt(
  child: ChildProfile,
  theme: Theme,
  ideas?: CustomIdeas | null
): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(child, theme, ideas),
  };
}
