import { DEFAULT_MINI_CASE_IMAGE, isMiniCaseImageKey, miniCaseImageLabel } from "@/config/miniCaseImages";
import { SCENES, SCENE_HEIGHT, SCENE_WIDTH } from "./scenes";

type MiniCaseImageProps = {
  /** Clave del catalogo; una desconocida (o ausente) muestra la imagen predeterminada. */
  imageKey: string | null | undefined;
  className?: string;
  /** Con texto alternativo, la imagen se anuncia; sin el (en el juego) es solo decoracion. */
  label?: string;
};

/** Un dibujo del catalogo de los mini casos. */
export function MiniCaseImage({ imageKey, className, label }: MiniCaseImageProps) {
  const key = isMiniCaseImageKey(imageKey) ? imageKey : DEFAULT_MINI_CASE_IMAGE;
  const Scene = SCENES[key];

  return (
    <svg
      viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
      data-image={key}
    >
      <title>{label ?? miniCaseImageLabel(key)}</title>
      <Scene />
    </svg>
  );
}
