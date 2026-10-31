import { Phone } from "lucide-react";
import { Link } from "react-router-dom";

import {
  DEVELOPER,
  PROJECT_FUND,
  PROJECT_OBJECTIVE,
  PROJECT_SUBTITLE,
  PROJECT_TITLE,
  TEAM,
} from "@/config/projectInfo";

import { TeamPhoto } from "./TeamPhoto";

type ProjectHomeProps = {
  /** El botón grande bajo el equipo: a donde lleva cada rol desde su inicio. */
  action: { label: string; to: string };
};

/**
 * «Inicio» de estudiantes y administradores (es la misma pantalla): presenta el proyecto, su equipo y a quien
 * desarrolló la plataforma. Solo cambia a donde lleva el botón.
 */
export function ProjectHome({ action }: ProjectHomeProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center text-white">
      <header className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Neuroflex</h1>

        <p className="text-base font-semibold leading-snug sm:text-lg">{PROJECT_TITLE}</p>

        <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{PROJECT_SUBTITLE}</p>

        <p className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-200 sm:text-sm">
          {PROJECT_FUND}
        </p>
      </header>

      <section aria-labelledby="project-objective" className="flex w-full flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-left sm:p-6">
        <h2 id="project-objective" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Objetivo general
        </h2>

        <p className="text-sm leading-relaxed text-zinc-200 sm:text-base">{PROJECT_OBJECTIVE}</p>
      </section>

      <section aria-label="Equipo del proyecto" className="grid w-full grid-cols-1 gap-8 min-[480px]:grid-cols-2">
        {TEAM.map((member) => (
          <figure key={member.photoName} className="flex flex-col items-center gap-3">
            <TeamPhoto name={member.name} photoName={member.photoName} position={member.photoPosition} />

            <figcaption className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">{member.name}</span>
              <span className="text-sm text-zinc-400">{member.role}</span>
            </figcaption>
          </figure>
        ))}
      </section>

      <Link
        to={action.to}
        className="inline-flex min-h-12 items-center rounded-full bg-white px-8 py-3 text-base font-semibold text-black shadow-lg hover:bg-zinc-200"
      >
        {action.label}
      </Link>

      <footer className="flex w-full flex-col items-center gap-1 border-t border-zinc-800 pt-6 text-xs text-zinc-400">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Desarrollo de la plataforma</p>
        <p className="text-[13px] font-semibold text-zinc-200">{DEVELOPER.name}</p>
        <p>{DEVELOPER.role}</p>
        <a
          href={DEVELOPER.phoneLink}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <Phone className="size-3.5" aria-hidden="true" />
          {DEVELOPER.phone}
        </a>
      </footer>
    </div>
  );
}
