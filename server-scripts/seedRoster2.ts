import roster from "./roster-2.json";

function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function parseName(raw: string) {
  const [paternalLastName, maternalLastName, ...firstNameParts] = raw
    .trim()
    .split(/\s+/);

  return {
    paternalLastName: titleCase(paternalLastName),
    maternalLastName: titleCase(maternalLastName),
    firstName: titleCase(firstNameParts.join(" ")),
  };
}

async function seed(adminSessionCookie: string) {
  for (const row of roster) {
    const { paternalLastName, maternalLastName, firstName } = parseName(row.raw);

    const response = await fetch("http://localhost:3000/api/admin/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminSessionCookie,
      },
      body: JSON.stringify({
        rut: row.rut,
        firstName,
        paternalLastName,
        maternalLastName,
        paralelo: 1,
        ciudad: titleCase(row.ciudad),
        region: row.region,
        celular: row.celular,
      }),
    });

    const result = (await response.json()) as { success: boolean; message: string };
    console.log(row.rut, result.success ? "OK" : result.message);
  }
}

const cookie = process.argv[2];

if (!cookie) {
  console.error("Falta la cookie de sesion. Uso: npx tsx server-scripts/seedRoster2.ts \"neuroflex_session=...\"");
  process.exit(1);
}

seed(cookie);