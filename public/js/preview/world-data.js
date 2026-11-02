export function mapRegions(model) {
  const lookup = new Map(model.regions.map((r) => [r.id, r]));
  return model.worldDisplay?.length
    ? model.worldDisplay
        .map((d) => ({ ...lookup.get(d.exploration_id), groups: d.group?.items ?? [] }))
        .filter((r) => r.id)
    : model.regions.filter((r) => !r.parent_id);
}
export function regionRows(r, model) {
  const rows = [];
  if (r.type === 'Reputation') rows.push(['Danh vọng', 'Cấp ' + r.level]);
  if (r.seven_statue_level > 0) rows.push(['Thất Thiên Thần Tượng', 'Cấp ' + r.seven_statue_level]);
  for (const o of r.offerings ?? []) rows.push([o.name, 'Cấp ' + o.level]);
  for (const g of r.groups ?? []) {
    const part = model.regions.find((x) => x.id === g.area_ids?.[0]);
    if (part) rows.push([part.name, Math.min(100, Number(g.exploration_percentage) / 10) + '%']);
  }
  return rows;
}
