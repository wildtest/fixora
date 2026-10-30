import type { ReactNode } from "react";
import { JOURNEY_STAGES } from "@/domain/repair/journey";
import { ORDER_STATUS_LABELS } from "@/domain/repair/order-status";
import { EntryPoint } from "./entry-point";
import {
  HeroIllustration,
  StepCodeArt,
  StepFormArt,
  StepTrackArt,
} from "./landing-illustrations";
import { ENTRY_POINTS } from "./entry-points";
import {
  ArrowForwardIcon,
  AssignmentIcon,
  CheckCircleIcon,
  DescriptionIcon,
  DevicesIcon,
  HashIcon,
  PaymentsIcon,
  NoAccountIcon,
  SearchIcon,
  ShieldIcon,
  TimelineIcon,
  VisibilityIcon,
} from "./icons";

// Secciones de PUB-01 (DESIGN.md §3.1, referencia Stitch aprobada). Presentación pura y estática: nada de lo que
// aquí se muestra es una orden, un código ni un progreso reales; las representaciones están rotuladas como
// ilustrativas y no hay ningún campo de consulta (la consulta vive solo en PUB-04).

const EYEBROW =
  "text-caption font-semibold uppercase tracking-widest text-primary-active";
const CARD = "lift rounded-md border border-line bg-surface p-6";

function IconBox({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "success";
}) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-md ${
        tone === "success"
          ? "bg-success-soft text-success"
          : "bg-primary-subtle text-primary-active"
      }`}
    >
      {children}
    </span>
  );
}

export function LandingHero() {
  return (
    <section
      aria-labelledby="lema"
      className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 lg:pt-4"
    >
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1 text-caption font-semibold uppercase tracking-widest text-primary-active">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          Sistema de seguimiento abierto
        </p>
        <h1
          id="lema"
          className="mt-4 max-w-3xl text-display-mobile text-content md:text-display"
        >
          Tu reparación,{" "}
          <span className="block text-primary">siempre bajo control.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-content-secondary">
          FIXORA te permite solicitar la reparación de tu equipo y consultar en
          cualquier momento su estado con tu código de seguimiento, sin crear
          una cuenta.
        </p>
      </div>
      <figure
        data-testid="hero-illustration"
        className="mx-auto w-full max-w-md lg:max-w-none"
      >
        <HeroIllustration />
        <figcaption className="mt-2 text-center text-caption text-content-secondary">
          Ilustración conceptual del proceso de reparación y seguimiento
        </figcaption>
      </figure>
    </section>
  );
}

export function LandingEntryCards() {
  return (
    <ul
      data-testid="entry-cards"
      className="mt-8 grid gap-6 md:mt-12 md:grid-cols-2"
    >
      <li className={`flex flex-col ${CARD}`}>
        <IconBox>
          <AssignmentIcon size={24} />
        </IconBox>
        <p className={`${EYEBROW} mt-6`}>Nuevo registro</p>
        <h2 className="mt-1 text-card-title text-content">
          Registrar reparación
        </h2>
        <p className="mt-2 text-body text-content-secondary">
          Cuéntanos qué le pasa a tu equipo y recibe al instante tu código único
          de seguimiento.
        </p>
        <div
          data-testid="illustration-register"
          className="mt-5 flex-1 rounded-sm bg-surface-secondary p-3"
        >
          <p className="text-caption text-content-secondary">
            Ilustración · al registrar recibes tu código
          </p>
          <div
            aria-hidden="true"
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full w-3/4 rounded-full bg-primary" />
          </div>
        </div>
        <div className="mt-6">
          <EntryPoint
            entry={ENTRY_POINTS.register}
            variant="primary"
            icon={<ArrowForwardIcon size={20} />}
          />
        </div>
      </li>
      <li className={`flex flex-col ${CARD}`}>
        <IconBox>
          <SearchIcon size={24} />
        </IconBox>
        <p className={`${EYEBROW} mt-6`}>Monitoreo inmediato</p>
        <h2 className="mt-1 text-card-title text-content">
          Consultar reparación
        </h2>
        <p className="mt-2 text-body text-content-secondary">
          Con tu código de seguimiento conoces la etapa actual de tu reparación,
          sin cuentas ni contraseñas.
        </p>
        <div
          data-testid="illustration-code"
          className="mt-5 flex-1 rounded-sm bg-surface-secondary p-3"
        >
          <p className="text-caption text-content-secondary">
            Ilustración · así se ve un código de seguimiento
          </p>
          <p
            aria-hidden="true"
            className="mt-2 flex flex-wrap gap-x-3 font-mono text-body font-medium tracking-widest text-content-muted"
          >
            <span>••••</span>
            <span>••••</span>
            <span>••••</span>
          </p>
        </div>
        <div className="mt-6">
          <EntryPoint
            entry={ENTRY_POINTS.consult}
            variant="secondary"
            icon={<ArrowForwardIcon size={20} />}
          />
        </div>
      </li>
    </ul>
  );
}

// Etapas del ejemplo ilustrativo: las siete del PRD, con una marcada como actual solo para explicar el concepto.
const EXAMPLE_CURRENT = 2;

export function LandingClarityBand() {
  return (
    <section
      aria-labelledby="claridad"
      className="mt-12 grid gap-6 rounded-md border border-line bg-surface-secondary p-6 md:mt-16 lg:grid-cols-2 lg:items-center lg:gap-10 lg:p-8"
    >
      <div>
        <p className={EYEBROW}>Flujo transparente</p>
        <h2 id="claridad" className="mt-1 text-h2 text-content">
          Claridad técnica en tiempo real sin fricción
        </h2>
        <p className="mt-3 text-body text-content-secondary">
          Cada cambio de estado de tu reparación queda registrado y puedes verlo
          cuando quieras con tu código de seguimiento, desde tu móvil o
          cualquier navegador.
        </p>
      </div>
      <div
        data-testid="illustration-journey"
        className="rounded-md border border-line bg-surface p-4"
      >
        <p className="inline-flex rounded-xs bg-primary-subtle px-2 py-0.5 text-caption font-semibold uppercase tracking-widest text-primary-active">
          Ejemplo ilustrativo
        </p>
        <p className="mt-3 text-small text-content-secondary">
          Etapa {EXAMPLE_CURRENT + 1} de {JOURNEY_STAGES.length} ·{" "}
          {ORDER_STATUS_LABELS[JOURNEY_STAGES[EXAMPLE_CURRENT]]}
        </p>
        <div aria-hidden="true" className="mt-3 flex items-center">
          <span className="mr-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-active">
            <DevicesIcon size={18} />
          </span>
          {JOURNEY_STAGES.map((stage, index) => (
            <span
              key={stage}
              className="flex flex-1 items-center last:flex-none"
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  index < EXAMPLE_CURRENT
                    ? "border-primary bg-primary"
                    : index === EXAMPLE_CURRENT
                      ? "border-primary bg-surface"
                      : "border-line-strong bg-surface"
                }`}
              >
                {index === EXAMPLE_CURRENT ? (
                  <span className="size-1.5 rounded-full bg-primary" />
                ) : null}
              </span>
              {index < JOURNEY_STAGES.length - 1 ? (
                <span
                  className={`h-0.5 flex-1 ${index < EXAMPLE_CURRENT ? "bg-primary" : "bg-line"}`}
                />
              ) : null}
            </span>
          ))}
        </div>
        <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {JOURNEY_STAGES.map((stage, index) => (
            <li
              key={stage}
              aria-current={index === EXAMPLE_CURRENT ? "step" : undefined}
              className={`text-caption ${
                index === EXAMPLE_CURRENT
                  ? "font-semibold text-primary-active"
                  : index < EXAMPLE_CURRENT
                    ? "text-content"
                    : "text-content-muted"
              }`}
            >
              {ORDER_STATUS_LABELS[stage]}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  icon,
  art,
  note,
  noteIcon,
  children,
}: {
  number: string;
  title: string;
  icon: ReactNode;
  art: ReactNode;
  note: string;
  noteIcon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={`flex flex-col ${CARD}`}>
      <div className="flex items-center justify-between">
        <span className="rounded-sm bg-primary-subtle px-2.5 py-1 font-mono text-label font-medium text-primary-active">
          {number}
        </span>
        <span className="text-content-muted">{icon}</span>
      </div>
      <div className="mt-4 rounded-sm bg-surface-secondary px-4 py-2">
        {art}
      </div>
      <h3 className="mt-4 text-h3 text-content">{title}</h3>
      <p className="mt-2 flex-1 text-body text-content-secondary">{children}</p>
      <p className="mt-4 flex items-center gap-2 text-caption text-content-secondary">
        {noteIcon}
        {note}
      </p>
    </li>
  );
}

export function LandingHowItWorks() {
  return (
    <section aria-labelledby="como-funciona" className="mt-12 md:mt-16">
      <div className="text-center">
        <p className={EYEBROW}>Simple y directo</p>
        <h2 id="como-funciona" className="mt-1 text-h2 text-content">
          ¿Cómo funciona el proceso?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-body text-content-secondary">
          Una ruta pensada para que tengas visibilidad de tu reparación sin
          trámites innecesarios.
        </p>
      </div>
      <ol data-testid="how-it-works" className="mt-8 grid gap-6 md:grid-cols-3">
        <StepCard
          number="01"
          title="Registra tu equipo"
          icon={<DevicesIcon size={22} />}
          art={<StepFormArt />}
          note="Un equipo por solicitud"
          noteIcon={<CheckCircleIcon size={16} />}
        >
          Completa el formulario con tus datos de contacto y la descripción del
          problema de tu equipo.
        </StepCard>
        <StepCard
          number="02"
          title="Recibe tu código"
          icon={<HashIcon size={22} />}
          art={<StepCodeArt />}
          note="Código único para tu reparación"
          noteIcon={<CheckCircleIcon size={16} />}
        >
          Al registrar obtienes un código de seguimiento que debes conservar
          para consultar tu reparación.
        </StepCard>
        <StepCard
          number="03"
          title="Consulta el avance"
          icon={<VisibilityIcon size={22} />}
          art={<StepTrackArt />}
          note="Estado visible cuando quieras"
          noteIcon={<CheckCircleIcon size={16} />}
        >
          Revisa el estado de tu reparación en cualquier momento con tu código,
          sin crear una cuenta.
        </StepCard>
      </ol>
    </section>
  );
}

function ServiceCard({
  number,
  title,
  icon,
  detail,
  children,
}: {
  number: string;
  title: string;
  icon: ReactNode;
  detail: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={`flex flex-col ${CARD}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-label font-medium text-content-muted">
          {number}
        </span>
        <IconBox>{icon}</IconBox>
      </div>
      <h3 className="mt-4 text-h3 text-content">{title}</h3>
      <p className="mt-2 flex-1 text-body text-content-secondary">{children}</p>
      <div aria-hidden="true" className="mt-4 border-t border-line pt-4">
        {detail}
      </div>
    </li>
  );
}

const DETAIL_CHIP =
  "inline-flex items-center gap-2 rounded-sm bg-surface-secondary px-3 py-2 text-caption text-content-secondary";

export function LandingServices() {
  return (
    <section aria-labelledby="servicios" className="mt-12 md:mt-16">
      <div className="text-center">
        <p className={EYEBROW}>Qué incluye</p>
        <h2 id="servicios" className="mt-1 text-h2 text-content">
          Servicios para acompañar tu reparación
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-body text-content-secondary">
          Desde el registro hasta la entrega, todo lo que ves en FIXORA
          corresponde al recorrido real de tu reparación.
        </p>
      </div>
      <ul
        data-testid="services"
        className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <ServiceCard
          number="01"
          title="Registro de reparación"
          icon={<AssignmentIcon size={22} />}
          detail={
            <span className={DETAIL_CHIP}>
              <HashIcon size={16} />
              <span className="font-mono tracking-widest">•••• •••• ••••</span>
            </span>
          }
        >
          Registra tu equipo y describe el problema. Al terminar recibes un
          código de seguimiento único.
        </ServiceCard>
        <ServiceCard
          number="02"
          title="Diagnóstico y costo estimado"
          icon={<PaymentsIcon size={22} />}
          detail={
            <span className={DETAIL_CHIP}>
              <DescriptionIcon size={16} />
              Diagnóstico · Costo estimado
            </span>
          }
        >
          El taller registra el diagnóstico y el costo estimado, y los ves en tu
          consulta cuando la reparación llega a la etapa correspondiente.
        </ServiceCard>
        <ServiceCard
          number="03"
          title="Seguimiento del avance"
          icon={<TimelineIcon size={22} />}
          detail={
            <span className="flex items-center gap-1">
              {JOURNEY_STAGES.map((stage, index) => (
                <span
                  key={stage}
                  className={`h-1.5 flex-1 rounded-full ${index <= EXAMPLE_CURRENT ? "bg-primary" : "bg-line"}`}
                />
              ))}
            </span>
          }
        >
          Consulta el estado, el Repair Journey y el historial de progreso con
          tu código, sin crear una cuenta.
        </ServiceCard>
        <ServiceCard
          number="04"
          title="Entrega y cierre"
          icon={<CheckCircleIcon size={22} />}
          detail={
            <span className="flex flex-wrap items-center gap-2 text-caption">
              <span className="rounded-xs bg-primary-subtle px-2 py-0.5 text-primary-active">
                {ORDER_STATUS_LABELS.LISTO_PARA_RECOJO}
              </span>
              <ArrowForwardIcon size={14} />
              <span className="rounded-xs bg-success-soft px-2 py-0.5 text-success">
                {ORDER_STATUS_LABELS.ENTREGADO}
              </span>
            </span>
          }
        >
          Sigues tu reparación hasta que el equipo queda listo para recojo y es
          entregado.
        </ServiceCard>
      </ul>
    </section>
  );
}

function PrivacyCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone?: "success";
  children: ReactNode;
}) {
  return (
    <li
      className={`${CARD} border-t-4 ${tone === "success" ? "border-t-success" : "border-t-primary"}`}
    >
      <IconBox tone={tone}>{icon}</IconBox>
      <h3 className="mt-4 text-h3 text-content">{title}</h3>
      <p className="mt-2 text-body text-content-secondary">{children}</p>
    </li>
  );
}

export function LandingPrivacy() {
  return (
    <section
      aria-labelledby="privacidad"
      className="mt-12 rounded-md bg-surface-secondary p-6 md:mt-16 lg:p-8"
    >
      <p className={EYEBROW}>Compromiso FIXORA</p>
      <h2 id="privacidad" className="mt-1 text-h2 text-content">
        Privacidad y control absoluto
      </h2>
      <ul data-testid="privacy" className="mt-6 grid gap-6 md:grid-cols-3">
        <PrivacyCard
          title="Sin cuentas ni contraseñas"
          icon={<NoAccountIcon size={22} />}
        >
          No necesitas crear un usuario ni recordar contraseñas: para consultar
          solo usas tu código de seguimiento.
        </PrivacyCard>
        <PrivacyCard
          title="Trazabilidad de estado"
          icon={<TimelineIcon size={22} />}
        >
          Cada cambio de estado queda registrado con su fecha para que sepas en
          qué etapa va tu reparación.
        </PrivacyCard>
        <PrivacyCard
          title="Protección de datos personales"
          icon={<ShieldIcon size={22} />}
          tone="success"
        >
          La consulta pública no muestra tu teléfono ni tu correo, solo la
          información pública de tu reparación.
        </PrivacyCard>
      </ul>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer
      data-testid="landing-footer"
      className="mt-12 border-t border-line pt-6 text-center md:mt-16"
    >
      <p className="text-small font-medium text-content">
        FIXORA © 2026 <span aria-hidden="true">·</span> Tu reparación, siempre
        bajo control
      </p>
      <p className="mt-1 text-caption text-content-secondary">
        Entorno de demostración. No ingreses datos personales reales ni
        información sensible.
      </p>
    </footer>
  );
}
