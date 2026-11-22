import { CatalogView } from "../../../features/foods/catalog-view";
import { readFoodCatalog } from "../../../features/foods/service";
import { requireUser } from "../../../lib/auth/require-user";

export default async function FoodsPage() {
  await requireUser();
  const { catalog, groups } = await readFoodCatalog();
  return <>
    <header className="page-heading"><p className="eyebrow">Vaš lični dnevnik</p><h1>Namirnice</h1>
      <p>Vaš katalog i lična pravila za ocenjivanje obroka.</p>
    </header>
    <CatalogView catalog={catalog} groups={groups} />
  </>;
}
