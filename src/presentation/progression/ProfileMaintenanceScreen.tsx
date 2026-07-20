import { useRef, useState, type ChangeEvent } from 'react';

import {
  abandonActiveRun,
  deleteLocalProfile,
  exportActiveProfile,
  importLocalProfileToSlot,
  resetActiveProfile,
  restoreActiveProfile,
  showMenu,
} from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import {
  importProfileFromJson,
  type ImportedProfile,
} from '../../persistence/profileTransfer';
import type { ProfileSlot } from '../../persistence/profiles';
import styles from './ProgressionScreens.module.css';

interface ImportCandidate {
  readonly text: string;
  readonly imported: ImportedProfile;
}

const PROFILE_SLOTS: readonly ProfileSlot[] = [1, 2, 3];

function normalizedName(value: string): string {
  return value.normalize('NFC').trim();
}

export function ProfileMaintenanceScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, busy } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<ImportCandidate | null>(null);
  const [targetSlot, setTargetSlot] = useState<ProfileSlot>(profile?.slot ?? 1);
  const [deleteName, setDeleteName] = useState('');
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  if (!profile) return null;

  const downloadExport = async () => {
    setLocalMessage(null);
    try {
      const text = await dispatch(exportActiveProfile()).unwrap();
      const url = URL.createObjectURL(
        new Blob([text], { type: 'application/json;charset=utf-8' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `百戏奇牌-${profile.displayName}-档案.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setLocalMessage('档案已导出到下载目录');
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const readImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLocalMessage(null);
    try {
      const text = await file.text();
      const imported = importProfileFromJson(text);
      setCandidate({ text, imported });
      setTargetSlot(imported.profile.slot);
    } catch (error) {
      setCandidate(null);
      setLocalMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const importCandidate = async () => {
    if (!candidate) return;
    const target = profiles.find(({ slot }) => slot === targetSlot);
    const warning = target
      ? `第 ${targetSlot} 档“${target.displayName}”将被替换，并保留一步恢复点。`
      : `将导入到空的第 ${targetSlot} 档。`;
    if (!window.confirm(`${warning}\n确认继续？`)) return;
    try {
      await dispatch(
        importLocalProfileToSlot({
          text: candidate.text,
          targetSlot,
        }),
      ).unwrap();
      setCandidate(null);
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const completedObjectives = candidate?.imported.profile.objectives.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
  const completedAchievements = candidate?.imported.profile.achievements.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
  const deleteEnabled =
    normalizedName(deleteName) === normalizedName(profile.displayName);

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p>
            第 {profile.slot} 档 · {profile.displayName}
          </p>
          <h1>档案维护</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => dispatch(showMenu())}>
            返回主菜单
          </button>
        </div>
      </header>

      <div className={styles.scrollArea}>
        <div className={styles.maintenanceGrid}>
          <article className={styles.maintenanceCard}>
            <h2>导出当前档案</h2>
            <p>包含本档全部永久进度与可选活动牌局，不包含其他档位和恢复点。</p>
            <button
              type="button"
              className={styles.button}
              disabled={busy}
              onClick={() => void downloadExport()}
            >
              下载档案文件
            </button>
          </article>

          <article className={styles.maintenanceCard}>
            <h2>导入到指定档位</h2>
            <p>先校验、迁移并预览文件，再选择目标档位；覆盖前会保存一步恢复点。</p>
            <button
              type="button"
              className={styles.button}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              选择档案文件
            </button>
            <input
              ref={fileInput}
              className={styles.hiddenInput}
              type="file"
              accept="application/json,.json"
              onChange={(event) => void readImport(event)}
            />
          </article>

          <article className={styles.maintenanceCard}>
            <h2>{profile.activeRunId ? '放弃活动牌局' : '当前没有活动牌局'}</h2>
            <p>弃局只清除当前牌局，已经提交的永久进度会保留。</p>
            <button
              type="button"
              className={styles.button}
              disabled={busy || !profile.activeRunId}
              onClick={() => {
                if (window.confirm('确定放弃当前牌局？此操作不会重置永久进度。')) {
                  void dispatch(abandonActiveRun({}));
                }
              }}
            >
              放弃当前牌局
            </button>
          </article>

          <article className={styles.maintenanceCard}>
            <h2>重置与一步恢复</h2>
            <p>重置保留档位、姓名和建档时间；上一个完整档案与牌局可恢复一次。</p>
            <div className={styles.inlineActions}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm('重置当前档案的全部进度与牌局？重置前会保存恢复点。')
                  ) {
                    void dispatch(resetActiveProfile({}));
                  }
                }}
              >
                重置当前档案
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('用上一次档案操作的快照替换当前档案？')) {
                    void dispatch(restoreActiveProfile());
                  }
                }}
              >
                恢复上次档案操作
              </button>
            </div>
          </article>
        </div>

        {candidate ? (
          <article className={styles.importPreview}>
            <div>
              <small>
                已通过档案校验 · 档案版本 {candidate.imported.profile.schemaVersion}
              </small>
              <h2>{candidate.imported.profile.displayName}</h2>
              <p>
                目标 {completedObjectives} / 78 · 成就 {completedAchievements} / 31 · 奇牌{' '}
                {candidate.imported.profile.collection.discoveredJokerIds.length} / 150 ·
                {candidate.imported.run ? '含活动牌局' : '不含活动牌局'}
              </p>
            </div>
            <label>
              目标档位
              <select
                value={targetSlot}
                onChange={(event) =>
                  setTargetSlot(Number(event.target.value) as ProfileSlot)
                }
              >
                {PROFILE_SLOTS.map((slot) => {
                  const occupant = profiles.find((item) => item.slot === slot);
                  return (
                    <option key={slot} value={slot}>
                      第 {slot} 档 · {occupant?.displayName ?? '空档'}
                    </option>
                  );
                })}
              </select>
            </label>
            <button
              type="button"
              className={styles.button}
              disabled={busy}
              onClick={() => void importCandidate()}
            >
              确认导入
            </button>
          </article>
        ) : null}

        <div className={styles.dangerZone}>
          <h2>永久删除</h2>
          <p>此操作会删除档案、牌局和所有恢复记录，无法撤销。</p>
          <label>
            输入档案名以确认
            <input
              value={deleteName}
              placeholder={profile.displayName}
              onChange={(event) => setDeleteName(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.dangerButton}
            disabled={busy || !deleteEnabled}
            onClick={() => {
              if (window.confirm(`永久删除“${profile.displayName}”及全部恢复记录？`)) {
                void dispatch(deleteLocalProfile(profile.id));
              }
            }}
          >
            永久删除档案
          </button>
        </div>

        {localMessage ? <p className={styles.localMessage}>{localMessage}</p> : null}
      </div>
    </section>
  );
}
