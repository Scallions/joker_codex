import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import styles from './StagePrimitives.module.css';

function classes(base: string | undefined, className?: string): string {
  return [base, className].filter(Boolean).join(' ');
}

export interface StageSurfaceProps extends HTMLAttributes<HTMLElement> {
  readonly children: ReactNode;
}

export function PaperLedger({ children, className, ...props }: StageSurfaceProps) {
  return (
    <section className={classes(styles.paperLedger, className)} {...props}>
      {children}
    </section>
  );
}

export function LacquerPanel({ children, className, ...props }: StageSurfaceProps) {
  return (
    <section className={classes(styles.lacquerPanel, className)} {...props}>
      {children}
    </section>
  );
}

export function StagePlacard({ children, className, ...props }: StageSurfaceProps) {
  return (
    <article className={classes(styles.placard, className)} {...props}>
      {children}
    </article>
  );
}

export interface SealButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: 'vermilion' | 'jade' | 'paper';
}

export function SealButton({
  children,
  className,
  tone = 'vermilion',
  type = 'button',
  ...props
}: SealButtonProps) {
  return (
    <button
      className={classes(styles.sealButton, className)}
      data-tone={tone}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function BrassCounter({
  className,
  label,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  readonly label: ReactNode;
  readonly value: ReactNode;
}) {
  return (
    <div className={classes(styles.brassCounter, className)} {...props}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StageDialog({ children, className, ...props }: StageSurfaceProps) {
  return (
    <section className={classes(styles.dialog, className)} {...props}>
      {children}
    </section>
  );
}

export function CatalogEmblemFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode }) {
  return (
    <div className={classes(styles.emblemFrame, className)} {...props}>
      {children}
    </div>
  );
}
