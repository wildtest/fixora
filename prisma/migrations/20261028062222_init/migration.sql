-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "device_type" AS ENUM ('CELULAR', 'TABLET', 'LAPTOP', 'PC', 'CONSOLA', 'OTRO');

-- CreateEnum
CREATE TYPE "note_visibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "rate_limit_surface" AS ENUM ('PUBLIC_TRACKING', 'ADMIN_LOGIN');

-- CreateTable
CREATE TABLE "repair_orders" (
    "id" UUID NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "status" "order_status" NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_name_search" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "device_type" "device_type" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "problem_description" TEXT NOT NULL,
    "diagnosis" TEXT,
    "estimated_cost" DECIMAL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repair_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "order_status",
    "to_status" "order_status" NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diagnosis_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "previous_value" DECIMAL,
    "new_value" DECIMAL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cost_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_notes" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "visibility" "note_visibility" NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_idempotency" (
    "key_hash" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "registration_idempotency_pkey" PRIMARY KEY ("key_hash")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "subject_key" TEXT NOT NULL,
    "surface" "rate_limit_surface" NOT NULL,
    "window_start" TIMESTAMPTZ(3) NOT NULL,
    "failure_count" INTEGER NOT NULL,
    "blocked_until" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("subject_key","surface")
);

-- CreateIndex
CREATE UNIQUE INDEX "repair_orders_tracking_code_key" ON "repair_orders"("tracking_code");

-- CreateIndex
CREATE INDEX "repair_orders_created_at_id_idx" ON "repair_orders"("created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "repair_orders_status_created_at_id_idx" ON "repair_orders"("status", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "order_status_history_order_id_occurred_at_idx" ON "order_status_history"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "order_status_history_order_id_to_status_key" ON "order_status_history"("order_id", "to_status");

-- CreateIndex
CREATE INDEX "diagnosis_history_order_id_occurred_at_idx" ON "diagnosis_history"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "cost_history_order_id_occurred_at_idx" ON "cost_history"("order_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "order_notes_order_id_visibility_created_at_idx" ON "order_notes"("order_id", "visibility", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "registration_idempotency_order_id_key" ON "registration_idempotency"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_singleton_key" ON "admin_users"("singleton");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_user_id_idx" ON "admin_sessions"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_history" ADD CONSTRAINT "diagnosis_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_history" ADD CONSTRAINT "cost_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_idempotency" ADD CONSTRAINT "registration_idempotency_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "repair_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- SQL manual (CHG-02, D-5/D-6/D-7). Lo que Prisma no expresa: CHECK, singleton y GRANT.
-- Sin triggers de negocio. Sin contraseñas ni nombres de secretos.
-- ---------------------------------------------------------------------------------------------

-- CHECK(version >= 1) en órdenes y notas (TD §11, §14.1).
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_version_check" CHECK ("version" >= 1);
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_version_check" CHECK ("version" >= 1);

-- CHECK de costo: nulo o > 0, con a lo sumo dos decimales (TD §8, §11).
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_estimated_cost_check"
  CHECK ("estimated_cost" IS NULL OR ("estimated_cost" > 0 AND "estimated_cost" = round("estimated_cost", 2)));

-- CHECK de SC-07: sin diagnóstico y costo no hay ESPERANDO_APROBACION ni posteriores.
-- CANCELADO queda fuera a propósito (TD §11).
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_sc07_check"
  CHECK (
    "status" NOT IN ('ESPERANDO_APROBACION', 'EN_REPARACION', 'LISTO_PARA_RECOJO', 'ENTREGADO')
    OR ("diagnosis" IS NOT NULL AND "estimated_cost" IS NOT NULL)
  );

-- CHECK de transiciones de una fila: evento inicial o uno de los 10 pares permitidos (TD §7.2, §11).
-- No garantiza la secuencia histórica: eso corresponde al dominio, a la transacción y a la versión.
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_transition_check"
  CHECK (
    ("from_status" IS NULL AND "to_status" = 'SOLICITUD_RECIBIDA')
    OR ("from_status" IS NOT NULL AND ("from_status", "to_status") IN (
      ('SOLICITUD_RECIBIDA', 'EQUIPO_RECIBIDO'),
      ('SOLICITUD_RECIBIDA', 'CANCELADO'),
      ('EQUIPO_RECIBIDO', 'EN_DIAGNOSTICO'),
      ('EQUIPO_RECIBIDO', 'CANCELADO'),
      ('EN_DIAGNOSTICO', 'ESPERANDO_APROBACION'),
      ('EN_DIAGNOSTICO', 'CANCELADO'),
      ('ESPERANDO_APROBACION', 'EN_REPARACION'),
      ('ESPERANDO_APROBACION', 'CANCELADO'),
      ('EN_REPARACION', 'LISTO_PARA_RECOJO'),
      ('LISTO_PARA_RECOJO', 'ENTREGADO')
    ))
  );

-- Singleton de admin_users: la columna "singleton" es UNIQUE (índice generado arriba por Prisma) y
-- solo admite TRUE, de modo que existe a lo sumo una fila.
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_singleton_check" CHECK ("singleton" IS TRUE);

-- ---------------------------------------------------------------------------------------------
-- Privilegios del rol de aplicación (D-7). El rol se crea por SQL, con el propietario de cada rama,
-- ANTES de migrar (nunca en la migración, nunca con contraseña aquí). Si no existe, la migración falla.
-- ---------------------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fixora_app') THEN
    RAISE EXCEPTION 'El rol de aplicación fixora_app no existe: créalo por SQL con el propietario de la rama antes de migrar';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "public" TO "fixora_app";

-- repair_orders: SELECT, INSERT y UPDATE por columnas (sin id, tracking_code ni created_at); sin DELETE.
GRANT SELECT, INSERT ON TABLE "repair_orders" TO "fixora_app";
GRANT UPDATE (
  "status", "customer_name", "customer_name_search", "customer_phone", "customer_email",
  "device_type", "brand", "model", "problem_description", "diagnosis", "estimated_cost",
  "version", "updated_at"
) ON TABLE "repair_orders" TO "fixora_app";

-- Historiales y idempotencia: solo lectura e inserción (append-only para el runtime).
GRANT SELECT, INSERT ON TABLE "order_status_history" TO "fixora_app";
GRANT SELECT, INSERT ON TABLE "diagnosis_history" TO "fixora_app";
GRANT SELECT, INSERT ON TABLE "cost_history" TO "fixora_app";
GRANT SELECT, INSERT ON TABLE "registration_idempotency" TO "fixora_app";

-- order_notes: SELECT, INSERT, DELETE y UPDATE por columnas (sin id, order_id, visibility ni created_at).
GRANT SELECT, INSERT, DELETE ON TABLE "order_notes" TO "fixora_app";
GRANT UPDATE ("content", "version", "updated_at") ON TABLE "order_notes" TO "fixora_app";

-- admin_users: solo lectura (el administrador se provisiona con el propietario, CHG-08).
GRANT SELECT ON TABLE "admin_users" TO "fixora_app";

-- admin_sessions: crear, validar, cerrar (DELETE) y actualizar solo last_seen_at (expires_at es absoluto).
GRANT SELECT, INSERT, DELETE ON TABLE "admin_sessions" TO "fixora_app";
GRANT UPDATE ("last_seen_at") ON TABLE "admin_sessions" TO "fixora_app";

-- Limitador: lo estrictamente necesario para registrar fallos, consultar bloqueos y limpiar.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "rate_limit_buckets" TO "fixora_app";

-- Sin secuencias (claves UUID y compuesta): no se concede ningún privilegio de secuencia.
