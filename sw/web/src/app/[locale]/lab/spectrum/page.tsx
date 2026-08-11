import SpectrumExplorerSection from "@/components/features/user/explore/spectrum/SpectrumExplorerSection";
import { getSpectrumByCelebId } from "@/actions/spectrum/getSpectrumByCelebId";
import { getSpectrumPeople } from "@/actions/spectrum/getSpectrumPeople";

export const revalidate = 300;

export default async function Page() {
  const people = await getSpectrumPeople(300);
  const selectedId = people[0]?.id ?? null;
  const initialSpectrum = selectedId ? await getSpectrumByCelebId(selectedId) : null;

  return (
    <SpectrumExplorerSection
      initialPeople={people}
      initialSelectedId={selectedId}
      initialSpectrum={initialSpectrum}
    />
  );
}
