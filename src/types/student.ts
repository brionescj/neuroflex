import type { AvatarId } from "@/config/avatars";
import type { Gender, StudyShift, University } from "./common";

export type Paralelo = 1 | 2 | 3 | 4 | 5;

export type Student = {
  rut: string;

  firstName: string;

  paternalLastName: string;

  maternalLastName: string;

  paralelo: Paralelo;

  entryYear: number;

  birthDate?: string;

  studyShift?: StudyShift;

  gender?: Gender;

  university?: University;

  enabled: boolean;

  registered: boolean;

  email?: string;

  celular?: string;

  comuna?: string;

  region?: string;

  avatarId: AvatarId;

  isDeleted: boolean;

  deletedAt?: string;

  deletedBy?: string;

  deletionReason?: string;
};

/** Una fila del Excel de carga masiva, con todas las celdas como texto (el servidor las interpreta). */
export type StudentImportRow = {
  /** Fila en el Excel (la 1 es el encabezado). */
  row: number;
  nombre: string;
  rut: string;
  fechaNacimiento: string;
  email: string;
  celular: string;
  comuna: string;
  region: string;
  jornada: string;
  genero: string;
};

/** ready = se cargaria; created = ya se cargo; exists = el RUT ya esta en el sistema; error = no se puede cargar. */
export type StudentImportStatus = "ready" | "created" | "exists" | "error";

export type StudentImportRowResult = {
  row: number;
  status: StudentImportStatus;
  rut?: string;
  name?: string;
  message?: string;
  /** Datos opcionales que no se entendieron y quedaron sin rellenar. */
  warnings: string[];
};

export type StudentImportReport = {
  dryRun: boolean;
  results: StudentImportRowResult[];
  summary: {
    total: number;
    ready: number;
    created: number;
    exists: number;
    errors: number;
    withWarnings: number;
  };
};
