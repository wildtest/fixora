// Valor derivado de búsqueda por nombre (TD §19): una única función pura compartida por la escritura y por la
// búsqueda. `trim`, descomposición Unicode, minúsculas, eliminación de marcas diacríticas, colapso de espacios
// interiores y `ñ → n` (`Muñoz → munoz`). No altera `customer_name` ni entra en ningún DTO.

// Marcas combinantes diacríticas (U+0300–U+036F) que deja la descomposición NFD.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalizeCustomerNameSearch(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .toLowerCase()
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, ' ');
}
