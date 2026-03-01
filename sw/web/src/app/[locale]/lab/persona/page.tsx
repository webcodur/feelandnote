import PersonaExplorerSection from "@/components/features/user/explore/persona/PersonaExplorerSection";
import { getPersonaByCelebId } from "@/actions/persona/getPersonaByCelebId";
import { getPersonaPeople } from "@/actions/persona/getPersonaPeople";

export const dynamic = "force-dynamic";

export default async function Page() {
  const people = await getPersonaPeople(300);
  const selectedId = people[0]?.id ?? null;
  const initialPersona = selectedId ? await getPersonaByCelebId(selectedId) : null;

  return (
    <PersonaExplorerSection
      initialPeople={people}
      initialSelectedId={selectedId}
      initialPersona={initialPersona}
    />
  );
}
