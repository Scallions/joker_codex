declare const idBrand: unique symbol;

export type StableId<Kind extends string> = string & {
  readonly [idBrand]: Kind;
};

export type CardId = StableId<'playing-card'>;
export type ProfileId = StableId<'profile'>;
export type RunId = StableId<'run'>;
export type JokerInstanceId = StableId<'joker-instance'>;
export type ConsumableInstanceId = StableId<'consumable-instance'>;
export type ShopOfferId = StableId<'shop-offer'>;
export type ShopId = StableId<'shop'>;
export type PackOfferId = StableId<'pack-offer'>;
export type VoucherOfferId = StableId<'voucher-offer'>;
export type ChoiceId = StableId<'choice'>;
export type RewardReceiptId = StableId<'reward-receipt'>;
export type EffectInstanceId = StableId<'effect-instance'>;

export function stableId<Kind extends string>(value: string): StableId<Kind> {
  return value as StableId<Kind>;
}
