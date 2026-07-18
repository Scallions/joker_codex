export function roundHalfDown(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('价格必须是非负有限数');
  }
  const integer = Math.floor(value);
  const fraction = value - integer;
  return fraction > 0.5 ? integer + 1 : integer;
}

export function purchasePrice(
  baseCost: number,
  editionCost: number,
  discountBasisPoints: number,
  minimumPrice = 1,
): number {
  if (
    !Number.isSafeInteger(baseCost) ||
    !Number.isSafeInteger(editionCost) ||
    !Number.isSafeInteger(discountBasisPoints) ||
    !Number.isSafeInteger(minimumPrice) ||
    baseCost < 0 ||
    editionCost < 0 ||
    discountBasisPoints < 0 ||
    minimumPrice < 0
  ) {
    throw new RangeError('价格参数必须是非负安全整数');
  }
  const undiscounted = baseCost + editionCost;
  if (undiscounted === 0) return 0;
  return Math.max(
    minimumPrice,
    roundHalfDown((undiscounted * discountBasisPoints) / 10_000),
  );
}

export function saleValue(
  baseCost: number,
  editionCost: number,
  discountBasisPoints: number,
  override: number | null,
): number {
  if (override !== null) return override;
  return Math.max(
    1,
    Math.floor(purchasePrice(baseCost, editionCost, discountBasisPoints) / 2),
  );
}

export function canAfford(money: number, allowedDebt: number, price: number): boolean {
  return (
    Number.isSafeInteger(money) &&
    Number.isSafeInteger(allowedDebt) &&
    Number.isSafeInteger(price) &&
    price >= 0 &&
    money + allowedDebt >= price
  );
}
