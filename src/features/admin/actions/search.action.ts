import { findRoleByRut } from "../services/search.service";

export async function findRoleByRutAction(rut: string) {
  return findRoleByRut(rut);
}