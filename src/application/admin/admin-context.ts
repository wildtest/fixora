// Contexto de administrador autenticado (CHG-08, D9): tipo opaco que solo emite el servicio de sesión tras
// comprobar la sesión en PostgreSQL. Los casos de uso exclusivamente administrativos lo reciben en su firma.
//
// Es una defensa ESTRUCTURAL/estática, no una frontera de seguridad: TypeScript no impide un bypass deliberado.
// La autoridad es la comprobación en runtime contra la base de datos.

declare const adminContextBrand: unique symbol;

export type AdminContext = {
  readonly [adminContextBrand]: true;
  readonly adminId: string;
};

/** Solo para el servicio de sesión (y para pruebas): emite el contexto de una sesión ya verificada. */
export function issueAdminContext(adminId: string): AdminContext {
  return Object.freeze({ adminId }) as unknown as AdminContext;
}
