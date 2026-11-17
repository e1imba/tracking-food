import { requireUser } from "../../../lib/auth/require-user";
import { readSymptoms } from "../../../features/symptoms/service";
import { SymptomHistory } from "../../../features/symptoms/symptom-history";
import { SymptomEntry } from "../../../features/symptoms/symptom-entry";

export default async function SymptomsPage() {
  await requireUser();
  const history = await readSymptoms();
  return <>
    <header className="page-heading"><p className="eyebrow">Vaš lični dnevnik</p><h1>Simptomi</h1><p>Pregled simptoma u vašem privatnom dnevniku.</p></header>
    <section aria-label="Privatna istorija"><SymptomHistory history={history} /></section>
    <SymptomEntry />
  </>;
}
