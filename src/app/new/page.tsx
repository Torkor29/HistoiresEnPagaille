import WizardClient from '@/components/Wizard/WizardClient';

// Évite le prerender au build (page qui utilise API/DB au chargement)
export const dynamic = 'force-dynamic';

export default function NewStoryPage() {
  return <WizardClient />;
}
