import { useState } from "react";

import { PHOTO_EXTENSIONS } from "@/config/projectInfo";

type TeamPhotoProps = {
  name: string;
  /** Nombre del archivo en public/equipo/, sin extensión. */
  photoName: string;
  /** CSS `object-position` de la foto dentro del círculo. */
  position?: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Foto en un círculo. Prueba cada extensión admitida en public/equipo/; si ninguna existe,
 * muestra las iniciales. La imagen no se edita ni se recorta en el archivo: solo se encuadra.
 */
export function TeamPhoto({ name, photoName, position = "50% 50%" }: TeamPhotoProps) {
  const [attempt, setAttempt] = useState(0);
  const extension = PHOTO_EXTENSIONS[attempt];

  return (
    <div
      className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-800 sm:size-40"
    >
      {extension ? (
        <img
          key={extension}
          src={`/equipo/${photoName}.${extension}`}
          alt={`Fotografía de ${name}`}
          width={160}
          height={160}
          className="size-full object-cover"
          style={{ objectPosition: position }}
          onError={() => setAttempt((current) => current + 1)}
        />
      ) : (
        <span aria-hidden="true" className="text-3xl font-semibold text-zinc-400 sm:text-4xl">
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
