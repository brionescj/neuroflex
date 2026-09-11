type Named = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
};

export function matchesQuery(item: Named, query: string): boolean {
  const q = query.trim().toLowerCase();

  if (!q) return true;

  if (item.rut.toLowerCase().startsWith(q)) return true;

  const words = `${item.firstName} ${item.paternalLastName} ${item.maternalLastName}`
    .toLowerCase()
    .split(/\s+/);

  return words.some((word) => word.startsWith(q));
}