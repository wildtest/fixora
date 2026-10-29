"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AdminOrderPage } from "@/domain/admin/order-directory";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, isOrderStatus, type OrderStatus } from "@/domain/repair/order-status";
import { Alert } from "../../_components/alert";
import { ButtonLink } from "../../_components/button-link";
import { SearchIcon, SearchOffIcon } from "../../_components/icons";
import { OrderList } from "../_components/order-row";
import { searchOrders } from "./actions";

// ADM-03 como un contenedor de cliente con estados (CHG-09a D3/D8):
//   idle → loading → results | empty | error | session-expired
// La búsqueda puede contener un código (secreto bearer) o un nombre (PII): vive SOLO en el estado de interacción y
// viaja en el cuerpo de la Server Action; nunca en la URL (que solo guarda el filtro de estado, `?estado=`), ni en
// almacenamiento persistente. Con Cache Components la Activity puede conservar el estado al ocultarse la ruta; por
// eso el reinicio al salir es explícito (cleanup del efecto) y recargar vuelve a leer el estado persistido vigente.

type Failure = "SESSION_EXPIRED" | "INTERNAL_ERROR";
type Query = { readonly search: string; readonly status: OrderStatus | null; readonly page: number };

const retryButton =
  "transition-soft inline-flex h-11 w-full items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover md:w-auto lg:h-10";
const pagerButton =
  "transition-soft inline-flex h-11 min-w-28 items-center justify-center rounded-sm bg-primary-subtle px-4 text-button text-primary-active hover:bg-secondary-hover disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled lg:h-10";

function syncUrl(status: OrderStatus | null) {
  // Solo el filtro de estado en la URL; la búsqueda y la página nunca.
  window.history.replaceState(null, "", status ? `/admin/ordenes?estado=${status}` : "/admin/ordenes");
}

export function OrderDirectory({ initialPage, initialStatus }: { initialPage: AdminOrderPage; initialStatus: OrderStatus | null }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState<Query>({ search: "", status: initialStatus, page: 1 });
  const [data, setData] = useState<AdminOrderPage>(initialPage);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);
  const requestId = useRef(0);

  useEffect(
    () => () => {
      setDraft("");
      setQuery({ search: "", status: null, page: 1 });
      setFailure(null);
      setPending(false);
    },
    [],
  );

  async function run(next: Query) {
    const id = (requestId.current += 1);
    setPending(true);
    setFailure(null);
    try {
      const result = await searchOrders({ search: next.search, status: next.status ?? "", page: next.page });
      if (id !== requestId.current) return; // llegó una respuesta más nueva
      if (result.ok) {
        setData(result.data);
        setQuery({ ...next, page: result.data.page });
      } else {
        setFailure(result.code === "SESSION_EXPIRED" ? "SESSION_EXPIRED" : "INTERNAL_ERROR");
      }
    } catch {
      if (id === requestId.current) setFailure("INTERNAL_ERROR");
    } finally {
      if (id === requestId.current) setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run({ ...query, search: draft, page: 1 });
  }

  function chooseStatus(status: OrderStatus | null) {
    syncUrl(status);
    void run({ ...query, status, page: 1 });
  }

  function clearAll() {
    setDraft("");
    syncUrl(null);
    void run({ search: "", status: null, page: 1 });
  }

  const filtered = query.search.trim() !== "" || query.status !== null;

  return (
    <div>
      <h1 className="text-h2 text-content">Listado de órdenes</h1>

      <form role="search" noValidate onSubmit={submit} aria-label="Buscar órdenes" className="mt-4">
        <label htmlFor="orders-search" className="text-label text-content">
          Buscar por código o nombre
        </label>
        <div className="mt-1 flex flex-col gap-2 md:flex-row">
          <input
            id="orders-search"
            name="search"
            type="search"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-describedby="orders-search-help"
            className="transition-soft block h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-body text-content placeholder:text-content-muted hover:border-content-secondary md:max-w-md"
          />
          <button
            type="submit"
            disabled={pending}
            className="transition-soft inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-button text-white hover:bg-primary-hover active:bg-primary-active disabled:cursor-default disabled:bg-surface-secondary disabled:text-content-disabled lg:h-10"
          >
            <SearchIcon size={18} />
            Buscar
          </button>
        </div>
        <p id="orders-search-help" className="mt-1 text-small text-content-secondary">
          Solo puedes buscar por código de seguimiento (completo) o por nombre del cliente.
        </p>
      </form>

      <div className="mt-4">
        <div role="group" aria-label="Filtrar por estado" className="hidden flex-wrap gap-2 lg:flex">
          {[null, ...ORDER_STATUSES].map((status) => {
            const selected = query.status === status;
            return (
              <button
                key={status ?? "todos"}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseStatus(status)}
                className={`transition-soft inline-flex h-9 items-center rounded-full border px-3 text-label ${
                  selected
                    ? "border-primary bg-primary-subtle text-primary-active"
                    : "border-line-strong bg-surface text-content-secondary hover:bg-page"
                }`}
              >
                {status === null ? "Todos" : ORDER_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
        <div className="lg:hidden">
          <label htmlFor="orders-status" className="text-label text-content">
            Filtrar por estado
          </label>
          <select
            id="orders-status"
            value={query.status ?? ""}
            onChange={(event) => chooseStatus(isOrderStatus(event.target.value) ? event.target.value : null)}
            className="transition-soft mt-1 block h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-body text-content"
          >
            <option value="">Todos</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6" aria-busy={pending}>
        {failure === "SESSION_EXPIRED" ? (
          <Alert
            variant="warning"
            role="alert"
            title="Tu sesión expiró"
            action={<ButtonLink href="/admin/acceso">Ir al inicio de sesión</ButtonLink>}
          >
            La acción no se ejecutó. Inicia sesión nuevamente para continuar.
          </Alert>
        ) : failure === "INTERNAL_ERROR" ? (
          <Alert
            variant="error"
            role="alert"
            title="Ocurrió un problema inesperado."
            action={
              <button type="button" onClick={() => void run(query)} className={retryButton}>
                Reintentar
              </button>
            }
          >
            Inténtalo nuevamente.
          </Alert>
        ) : data.totalItems === 0 ? (
          <section className="mx-auto flex w-full max-w-md flex-col items-center rounded-md border border-line bg-surface px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-md bg-surface-secondary text-content-secondary">
              <SearchOffIcon size={24} />
            </span>
            <h2 className="mt-4 text-h3 text-content">
              {filtered ? "No se encontraron órdenes con esa búsqueda o filtro." : "Aún no hay órdenes."}
            </h2>
            <p className="mt-2 text-small text-content-secondary">
              {filtered ? "Verifica los términos o elige otro estado." : "Cuando un cliente registre una reparación, aparecerá aquí."}
            </p>
            {filtered ? (
              <button type="button" onClick={clearAll} className={`${retryButton} mt-6`}>
                Limpiar búsqueda y filtros
              </button>
            ) : null}
          </section>
        ) : (
          <div className={pending ? "opacity-60" : undefined}>
            <p data-testid="orders-total" role="status" className="mb-3 text-small text-content-secondary">
              {data.totalItems === 1 ? "1 orden" : `${data.totalItems} órdenes`}
            </p>
            <OrderList orders={data.items} label="Órdenes" />
            {data.totalPages > 1 ? (
              <nav aria-label="Paginación" className="mt-4 flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
                <button type="button" disabled={pending || data.page <= 1} onClick={() => void run({ ...query, page: data.page - 1 })} className={pagerButton}>
                  Anterior
                </button>
                <p data-testid="orders-page" className="text-center text-small text-content-secondary">
                  Página {data.page} de {data.totalPages}
                </p>
                <button type="button" disabled={pending || data.page >= data.totalPages} onClick={() => void run({ ...query, page: data.page + 1 })} className={pagerButton}>
                  Siguiente
                </button>
              </nav>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
