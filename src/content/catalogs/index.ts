import { BLIND_ROWS } from './blinds';
import { BOOSTER_PROFILES, BOOSTER_ROWS } from './boosters';
import { CHALLENGE_ROWS } from './challenges';
import { PLANET_ROWS, SPECTRAL_ROWS, TAROT_ROWS } from './consumables';
import { DECK_ROWS } from './decks';
import { EDITION_ROWS, ENHANCEMENT_ROWS, SEAL_ROWS } from './modifiers';
import { STAKE_ROWS } from './stakes';
import { TAG_ROWS } from './tags';
import { VOUCHER_ROWS } from './vouchers';

export const CATALOG_ROWS = [
  ...DECK_ROWS,
  ...STAKE_ROWS,
  ...CHALLENGE_ROWS,
  ...VOUCHER_ROWS,
  ...TAROT_ROWS,
  ...PLANET_ROWS,
  ...SPECTRAL_ROWS,
  ...TAG_ROWS,
  ...BLIND_ROWS,
  ...BOOSTER_ROWS,
  ...ENHANCEMENT_ROWS,
  ...SEAL_ROWS,
  ...EDITION_ROWS,
] as const;

export { BOOSTER_PROFILES };
