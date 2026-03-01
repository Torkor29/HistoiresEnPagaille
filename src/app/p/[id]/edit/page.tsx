import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import WizardClient from '@/components/Wizard/WizardClient';
import type { ProjectSettings } from '@/lib/schemas';

async function getProjectForEdit(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { story: true },
  });
  return project;
}

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectForEdit(id);
  if (!project) notFound();

  const settings = (JSON.parse(project.settings || '{}') || {}) as Partial<ProjectSettings>;
  const initialSettings: Partial<ProjectSettings> = {
    ...settings,
    premadeSynopsis: project.story?.synopsis ?? undefined,
  };

  return (
    <WizardClient
      editProjectId={id}
      initialSettings={initialSettings}
      initialTitle={project.title || 'Sans titre'}
    />
  );
}
