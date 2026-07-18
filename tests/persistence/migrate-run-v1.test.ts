import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';
import { migrateRunV1ToV2 } from '../../src/persistence/migrations/migrateRunV1ToV2';

describe('V1 牌局迁移', () => {
  it('将进行中的试玩回合无随机消耗地迁移为守恒的 V2 状态', () => {
    const legacy = createFixtureRun('migration-round');
    const migrated = migrateRunV1ToV2(legacy);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.contentVersion).toBe('run-economy-2');
    expect(migrated.mode).toBe('migrated-foundation');
    expect(migrated.runId).toBe(legacy.runId);
    expect(migrated.checkpointId).toBe(legacy.checkpointId);
    expect(migrated.rngState).toBe(legacy.rngState);
    expect(migrated.phase).toEqual({ kind: 'round' });
    expect(migrated.deck.cards).toHaveLength(52);
    expect(migrated.round?.handIds).toEqual(legacy.hand.map((card) => card.id));
    expect(migrated.round?.drawPileIds).toEqual(legacy.drawPile.map((card) => card.id));
    expect(migrated.inventory.jokers).toHaveLength(1);
    expect(migrated.inventory.consumables).toHaveLength(1);
    expect(migrated.economy.money).toBe(legacy.money);
  });

  it('保留已生成的商店商品并将 V1 胜负映射为终态', () => {
    let legacy = { ...createFixtureRun('migration-shop'), targetScore: 1 };
    const selected = executeCommand(legacy, {
      type: 'toggle-card',
      checkpointId: legacy.checkpointId,
      cardId: legacy.hand[0]!.id,
    });
    if (!selected.ok) throw new Error(selected.rejection.message);
    legacy = selected.state;
    const played = executeCommand(legacy, {
      type: 'play-selected',
      checkpointId: legacy.checkpointId,
    });
    if (!played.ok) throw new Error(played.rejection.message);
    legacy = played.state;

    const shop = migrateRunV1ToV2(legacy);
    expect(shop.phase).toEqual({ kind: 'shop' });
    expect(shop.shop?.cardOffers.map((offer) => offer.id)).toEqual(
      legacy.shop?.offers.map((offer) => offer.id),
    );
    expect(shop.economy.money).toBe(legacy.money);

    const left = executeCommand(legacy, {
      type: 'leave-shop',
      checkpointId: legacy.checkpointId,
    });
    if (!left.ok) throw new Error(left.rejection.message);
    const won = migrateRunV1ToV2(left.state);
    expect(won.phase).toEqual({ kind: 'finished' });
    expect(won.result?.kind).toBe('won');

    const lost = migrateRunV1ToV2({
      ...createFixtureRun('migration-loss'),
      phase: 'lost',
    });
    expect(lost.phase).toEqual({ kind: 'run-lost' });
    expect(lost.result?.kind).toBe('lost');
  });
});
