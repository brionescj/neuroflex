import {
  formatRut,
  isValidRut,
  normalizeForDatabase,
} from "./rut";

console.log(formatRut("123456785"));
// 12.345.678-5

console.log(normalizeForDatabase("12.345.678-5"));
// 12345678-5

console.log(isValidRut("12.345.678-5"));
// false (porque ese RUT de ejemplo no tiene un DV válido)

console.log(isValidRut("11.111.111-1"));
// true