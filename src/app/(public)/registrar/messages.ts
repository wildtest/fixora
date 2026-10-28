import type { FieldErrorCode } from "@/domain/validation/validation";
import { PHONE_DIGITS, REPAIR_REQUEST_LIMITS, type RepairRequestField } from "@/domain/repair/repair-request";

// Mensajes por campo de PUB-02 (DESIGN.md §13.1): dicen cuál es el problema. El texto es de interfaz; el
// dominio solo devuelve códigos.
const MESSAGES: Record<RepairRequestField, Partial<Record<FieldErrorCode, string>>> = {
  customerName: {
    REQUIRED: "El nombre del cliente es obligatorio.",
    TOO_LONG: `El nombre no puede superar ${REPAIR_REQUEST_LIMITS.customerName} caracteres.`,
    INVALID_FORMAT: "El nombre contiene caracteres no válidos.",
  },
  customerPhone: {
    REQUIRED: "El teléfono es obligatorio.",
    INVALID_FORMAT: `Ingresa un teléfono válido: entre ${PHONE_DIGITS.min} y ${PHONE_DIGITS.max} dígitos; solo se permiten espacios, guiones, paréntesis y un + al inicio.`,
  },
  customerEmail: {
    INVALID_FORMAT: "Ingresa un correo válido o déjalo vacío.",
    TOO_LONG: `El correo no puede superar ${REPAIR_REQUEST_LIMITS.customerEmail} caracteres.`,
  },
  deviceType: {
    REQUIRED: "Debes seleccionar un tipo de equipo.",
    INVALID_FORMAT: "Debes seleccionar un tipo de equipo.",
  },
  brand: {
    REQUIRED: "La marca es obligatoria.",
    TOO_LONG: `La marca no puede superar ${REPAIR_REQUEST_LIMITS.brand} caracteres.`,
    INVALID_FORMAT: "La marca contiene caracteres no válidos.",
  },
  model: {
    TOO_LONG: `El modelo no puede superar ${REPAIR_REQUEST_LIMITS.model} caracteres.`,
    INVALID_FORMAT: "El modelo contiene caracteres no válidos.",
  },
  problemDescription: {
    REQUIRED: "La descripción del problema es obligatoria.",
    TOO_LONG: `La descripción no puede superar ${REPAIR_REQUEST_LIMITS.problemDescription} caracteres.`,
    INVALID_FORMAT: "La descripción contiene caracteres no válidos.",
  },
};

export function fieldMessage(field: RepairRequestField, code: FieldErrorCode | undefined): string | undefined {
  return code ? (MESSAGES[field][code] ?? "Revisa este campo.") : undefined;
}
