import { z } from "zod";

import { AVATARS, type AvatarId } from "@/config/avatars";
import { communesOf } from "@/config/communes";
import { MAX_STUDENT_AGE, MIN_STUDENT_AGE } from "@/config/studentOptions";
import { birthDateRange } from "@/features/admin/utils/birthDate";
import { EmailSchema } from "@/services/profile.schema";

const avatarIds = Object.keys(AVATARS) as [AvatarId, ...AvatarId[]];

export const ProfileFormSchema = z
  .object({
  email: EmailSchema,
  avatarId: z.enum(avatarIds),
  /** AAAA-MM-DD; vacio = sin fecha. Solo la usan los estudiantes. */
  birthDate: z.string().superRefine((value, ctx) => {
    if (value === "") return;

    const { min, max } = birthDateRange();

    // Las fechas AAAA-MM-DD se ordenan como texto.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < min || value > max) {
      ctx.addIssue({
        code: "custom",
        message: `La fecha debe corresponder a una edad entre ${MIN_STUDENT_AGE} y ${MAX_STUDENT_AGE} años.`,
      });
    }
  }),
  /** Vacio = sin jornada. Los valores son los de STUDY_SHIFT_OPTIONS. */
  studyShift: z.enum(["", "day", "evening"]),
  /** Vacio = sin informar («Seleccionar»). Los valores son los de GENDER_OPTIONS. */
  gender: z.enum(["", "female", "male", "other", "undisclosed"]),
  /** Region con su nombre oficial; vacio = sin region. */
  region: z.string(),
  /** Comuna de esa region (lista oficial); vacio = sin comuna. */
  comuna: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.comuna === "") return;

    if (value.region === "") {
      ctx.addIssue({ code: "custom", path: ["comuna"], message: "Elige primero la región." });
    } else if (!communesOf(value.region).includes(value.comuna)) {
      ctx.addIssue({ code: "custom", path: ["comuna"], message: "Elige una comuna de la lista." });
    }
  });

export type ProfileFormInput = z.infer<typeof ProfileFormSchema>;