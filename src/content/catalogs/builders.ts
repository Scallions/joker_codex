import {
  CATALOG_CONTENT_VERSION,
  type AvailabilityRule,
  type CatalogEffect,
  type CatalogFamily,
  type CatalogOperation,
  type CatalogRow,
  type DiscoveryRule,
} from '../schema/catalog';

export const ALWAYS_AVAILABLE: AvailabilityRule = { kind: 'always', value: null };
export const VISIBLE: DiscoveryRule = { kind: 'visible', value: null };

export interface RowInput {
  readonly family: CatalogFamily;
  readonly ordinal: number;
  readonly slug: string;
  readonly referenceIndex: string;
  readonly operations: readonly CatalogOperation[];
  readonly trigger?: CatalogEffect['trigger'] | undefined;
  readonly cost?: number | undefined;
  readonly weightUnits?: number | undefined;
  readonly availability?: AvailabilityRule | undefined;
  readonly discovery?: DiscoveryRule | undefined;
  readonly unlockObjectiveId?: string | null | undefined;
  readonly prerequisiteIds?: readonly string[] | undefined;
  readonly externalDependencyIds?: readonly string[] | undefined;
  readonly mechanicalProfileId?: string | null | undefined;
}

export function catalogId(family: CatalogFamily, slug: string): string {
  return `bxqp:${family}:${slug}`;
}

export function defineRow(input: RowInput): CatalogRow {
  const id = catalogId(input.family, input.slug);
  return {
    id,
    family: input.family,
    ordinal: input.ordinal,
    referenceIndex: input.referenceIndex,
    nameKey: `${id}.name`,
    descriptionKey: `${id}.description`,
    assetId: `bxqp:asset:${input.family}:${input.slug}`,
    ownershipId: `bxqp:ownership:${input.family}:${input.slug}`,
    introducedIn: CATALOG_CONTENT_VERSION,
    availability: input.availability ?? ALWAYS_AVAILABLE,
    unlockObjectiveId: input.unlockObjectiveId ?? null,
    discovery: input.discovery ?? VISIBLE,
    cost: input.cost ?? 0,
    weightUnits: input.weightUnits ?? 0,
    prerequisiteIds: input.prerequisiteIds ?? [],
    externalDependencyIds: input.externalDependencyIds ?? [],
    contractIds: [
      `contract:${input.family}:${input.referenceIndex.toLowerCase()}:positive`,
      `contract:${input.family}:${input.referenceIndex.toLowerCase()}:boundary`,
    ],
    effects: [
      {
        id: `bxqp:effect:${input.family}:${input.slug}`,
        handlerId: 'bxqp:handler:catalog-operations',
        trigger: input.trigger ?? 'passive',
        priority: 0,
        operations: input.operations,
      },
    ],
    mechanicalProfileId: input.mechanicalProfileId ?? null,
  };
}

export function twoDigit(value: number): string {
  return value.toString().padStart(2, '0');
}
