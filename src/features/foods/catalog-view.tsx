"use client";

import { useRef, useState } from "react";
import { normalizeFoodName } from "../meals/schema";
import { CatalogDialog } from "./catalog-dialog";
import { formatHour } from "./editor-fields";
import { FoodForm, NewFoodForm } from "./food-form";
import { GroupForm } from "./group-form";
import type { ScoringRules } from "./scoring";
import type { readFoodCatalog } from "./service";

const tabs = [
  { id: "all-foods", label: "Sve namirnice" },
  { id: "food-groups", label: "Grupe" },
] as const;

function RuleSummary({ baseScore, timeRanges }: ScoringRules) {
  if (baseScore === null && !timeRanges.length) return <p>Nije ocenjeno</p>;
  return <>
    {baseScore !== null && <p>Osnovna ocena {baseScore}/5</p>}
    {timeRanges.length > 0 && <ul className="catalog-ranges" aria-label="Vremenske ocene">
      {timeRanges.map(range => <li key={range.startHour}>
        {formatHour(range.startHour)}–{formatHour(range.endHour)} · {range.score}/5
      </li>)}
    </ul>}
  </>;
}

export function CatalogView({ catalog, groups }: Awaited<ReturnType<typeof readFoodCatalog>>) {
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const tabList = useRef<HTMLDivElement>(null);
  const groupById = new Map(groups.map(group => [group.id, group]));
  const counts = new Map<string, number>();
  for (const food of catalog) {
    if (food.groupId) counts.set(food.groupId, (counts.get(food.groupId) ?? 0) + 1);
  }
  const query = normalizeFoodName(search);
  const filtered = catalog.filter(food => {
    if (!normalizeFoodName(food.name).includes(query)) return false;
    const rated = food.groupId !== null || food.baseScore !== null || food.timeRanges.length > 0;
    switch (filter) {
      case "all": return true;
      case "rated": return rated;
      case "unrated": return !rated;
      case "ungrouped": return food.groupId === null;
      default: return food.groupId === filter;
    }
  });
  function selectTab(index: number) {
    setActive(index);
    setMessage("");
  }
  return <>
    <div className="catalog-tabs" role="tablist" aria-label="Katalog namirnica" ref={tabList} onKeyDown={event => {
      let index: number;
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight": index = (active + 1) % tabs.length; break;
        case "Home": index = 0; break;
        case "End": index = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      selectTab(index);
      tabList.current?.querySelectorAll("button")[index]?.focus();
    }}>
      {tabs.map((tab, index) => <button key={tab.id} id={`tab-${tab.id}`} role="tab" type="button"
        aria-selected={active === index} aria-controls={tab.id} tabIndex={active === index ? 0 : -1}
        onClick={() => selectTab(index)}>{tab.label}</button>)}
    </div>
    <p className="save-confirmation catalog-confirmation" role="status">{message}</p>
    <section role="tabpanel" id="all-foods" aria-labelledby="tab-all-foods" hidden={active !== 0}>
      {active === 0 && <>
        <div className="catalog-tools">
          <label className="field">Pretraži namirnice
            <input className="control" type="search" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <label className="field">Prikaži
            <select className="control" value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="all">Sve</option>
              <option value="rated">Ocenjene</option>
              <option value="unrated">Neocenjene</option>
              <option value="ungrouped">Bez grupe</option>
              {groups.length > 0 && <optgroup label="Grupe">{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</optgroup>}
            </select>
          </label>
        </div>
        <div className="entry-island">
          <CatalogDialog trigger={<button type="button" className="add-meal catalog-add"><span aria-hidden="true">＋</span>Dodaj namirnicu</button>} onSaved={setMessage}>
            <NewFoodForm />
          </CatalogDialog>
        </div>
        {filtered.length ? <ul className="catalog-list">
          {filtered.map(food => {
            const group = food.groupId ? groupById.get(food.groupId) : undefined;
            return <li key={food.id} className="catalog-row">
              <div className="catalog-copy">
                <h2 className="catalog-title">{food.name}</h2>
                {group ? <p>Grupa {group.name} · Nasleđena ocena</p> : <RuleSummary {...food} />}
              </div>
              <CatalogDialog trigger={<button type="button" className="secondary" aria-label={`Uredi namirnicu ${food.name}`}>Uredi</button>}
                onSaved={setMessage}>
                <FoodForm food={food} groups={groups} />
              </CatalogDialog>
            </li>;
          })}
        </ul> : <div className="empty-history"><h2>{catalog.length ? "Nema rezultata" : "Katalog je prazan"}</h2>
          <p>{catalog.length ? "Promenite pretragu ili filter." : "Dodajte namirnicu ovde ili prilikom unosa obroka."}</p>
        </div>}
      </>}
    </section>
    <section role="tabpanel" className="groups-panel" id="food-groups" aria-labelledby="tab-food-groups" hidden={active !== 1}>
      {active === 1 && <>
        <div className="entry-island">
          <CatalogDialog trigger={<button type="button" className="add-meal catalog-add"><span aria-hidden="true">＋</span>Dodaj grupu</button>} onSaved={setMessage}>
            <GroupForm catalog={catalog} />
          </CatalogDialog>
        </div>
        {groups.length ? <ul className="catalog-list">
          {groups.map(group => {
            const count = counts.get(group.id) ?? 0;
            return <li key={group.id} className="catalog-row">
              <div className="catalog-copy">
                <h2 className="catalog-title">{group.name}</h2>
                {group.description && <p className="full-text">{group.description}</p>}
                <p>Broj namirnica {count}</p>
                <RuleSummary {...group} />
              </div>
              <CatalogDialog trigger={<button type="button" className="secondary" aria-label={`Uredi grupu ${group.name}`}>Uredi</button>}
                onSaved={setMessage}>
                <GroupForm group={group} catalog={catalog} />
              </CatalogDialog>
            </li>;
          })}
        </ul> : <div className="empty-history"><h2>Još nema grupa</h2><p>Grupa deli ista pravila ocenjivanja svim svojim namirnicama.</p></div>}
      </>}
    </section>
  </>;
}
