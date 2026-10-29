import { Phone } from "lucide-react";
import { Link } from "react-router-dom";

import {
  DEVELOPER,
  PROJECT_FUND,
  PROJECT_SUBTITLE,
  PROJECT_TITLE,
  TEAM,
} from "@/config/projectInfo";
import { ROUTES } from "@/config/routes";

import { TeamPhoto } from "../components/TeamPhoto";

/** «Inicio» del estudiante: presenta el proyecto, su equipo y a quien desarrolló la plataforma. */
export default function StudentHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center text-white">
      <header className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">NeuroFlex</h1>

        <p className="text-base font-semibold leading-snug sm:text-lg">{PROJECT_TITLE}</p>

        <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{PROJECT_SUBTITLE}</p>

        <p className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-200 sm:text-sm">
          {PROJECT_FUND}
        </p>
      </header>

      <section aria-label="Equipo del proyecto" className="grid w-full grid-cols-1 gap-8 min-[480px]:grid-cols-2">
        {TEAM.map((member) => (
          <figure key={member.photoName} className="flex flex-col items-center gap-3">
            <TeamPhoto name={member.name} photoName={member.photoName} />

            <figcaption className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">{member.name}</span>
              <span className="text-sm text-zinc-400">{member.role}</span>
            </figcaption>
          </figure>
        ))}
      </section>

      <Link
        to={ROUTES.STUDENT_GAMES}
        className="inline-flex min-h-12 items-center rounded-full bg-white px-8 py-3 text-base font-semibold text-black shadow-lg hover:bg-zinc-200"
      >
        Ir a los juegos
      </Link>

      <footer className="flex w-full flex-col items-center gap-1 border-t border-zinc-800 pt-6 text-sm text-zinc-400">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Desarrollo de la plataforma</p>
        <p className="font-semibold text-zinc-200">{DEVELOPER.name}</p>
        <p>{DEVELOPER.role}</p>
        <a
          href={DEVELOPER.phoneLink}
          className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <Phone className="size-4" aria-hidden="true" />
          {DEVELOPER.phone}
        </a>
      </footer>
    </div>
  );
}
