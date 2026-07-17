import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import {
  createLocalProfile,
  deleteLocalProfile,
  exportActiveProfile,
  importLocalProfile,
  renameLocalProfile,
  selectLocalProfile,
  startLocalFixtureRun,
} from '../../app/store/appSlice';
import type { ProfileSlot } from '../../persistence/profiles';
import { importProfileFromJson } from '../../persistence/profileTransfer';
import styles from './ProfileScreen.module.css';

const SLOTS: readonly ProfileSlot[] = [1, 2, 3];
const SLOT_MARKS = ['甲', '乙', '丙'] as const;

export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, busy } = useAppSelector((state) => state.app);
  const [editingSlot, setEditingSlot] = useState<ProfileSlot | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [seedText, setSeedText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSlot || !displayName.trim()) return;
    if (editingProfileId) {
      const profile = profiles.find((item) => item.id === editingProfileId);
      if (!profile) return;
      void dispatch(
        renameLocalProfile({
          profileId: profile.id,
          displayName,
          nowEpochMs: Date.now(),
        }),
      ).then((result) => {
        if (renameLocalProfile.fulfilled.match(result)) {
          setEditingSlot(null);
          setEditingProfileId(null);
          setDisplayName('');
        }
      });
    } else {
      void dispatch(
        createLocalProfile({
          slot: editingSlot,
          displayName,
          nowEpochMs: Date.now(),
        }),
      ).then((result) => {
        if (createLocalProfile.fulfilled.match(result)) {
          setEditingSlot(null);
          setEditingProfileId(null);
          setDisplayName('');
        }
      });
    }
  };

  const beginCreate = (slot: ProfileSlot) => {
    setEditingProfileId(null);
    setEditingSlot(slot);
    setDisplayName('');
  };

  const beginRename = (profileId: string, slot: ProfileSlot, name: string) => {
    setEditingProfileId(profileId);
    setEditingSlot(slot);
    setDisplayName(name);
  };

  const exportProfile = async () => {
    setLocalError(null);
    try {
      const json = await dispatch(exportActiveProfile()).unwrap();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `百戏奇牌-${activeProfile?.displayName ?? '档案'}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  };

  const importProfile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLocalError(null);
    try {
      const text = await file.text();
      const preview = importProfileFromJson(text);
      const confirmed = window.confirm(
        `导入“${preview.profile.displayName}”将覆盖第 ${preview.profile.slot} 档，是否继续？`,
      );
      if (confirmed) await dispatch(importLocalProfile(text)).unwrap();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : String(error));
    }
  };

  const startRun = () => {
    if (!activeProfile) return;
    if (activeProfile.activeRunId) {
      void dispatch(selectLocalProfile(activeProfile.id));
      return;
    }
    const now = Date.now();
    void dispatch(
      startLocalFixtureRun({
        seed: seedText.trim() || `百戏-${activeProfile.slot}-${now.toString(36)}`,
        nowEpochMs: now,
      }),
    );
  };

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.header}>
        <div>
          <p>百戏奇牌 · 戏主名簿</p>
          <h1>三方戏台，三份命数</h1>
        </div>
        <div className={styles.utilityBar}>
          <button
            type="button"
            disabled={!activeProfile || busy}
            onClick={() => void exportProfile()}
          >
            导出当前档
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            导入档案
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importProfile(event)}
          />
          <span>所有进度仅存于此浏览器</span>
        </div>
      </header>

      <div className={styles.profileRow}>
        {SLOTS.map((slot, index) => {
          const profile = profiles.find((item) => item.slot === slot);
          const active = profile?.id === activeProfileId;
          return (
            <motion.article
              className={`${styles.ticket} ${active ? styles.activeTicket : ''}`}
              key={slot}
              whileHover={{ y: -5, rotate: index === 1 ? 0 : index === 0 ? -0.6 : 0.6 }}
              transition={{ duration: 0.16 }}
            >
              <span className={styles.slotMark}>{SLOT_MARKS[index]}</span>
              <p className={styles.slotLabel}>第 {slot} 档</p>
              {profile ? (
                <>
                  <h2>{profile.displayName}</h2>
                  <p className={styles.profileState}>
                    {profile.activeRunId ? '有一场未散的戏' : '静候开场'}
                  </p>
                  <button
                    className={styles.selectButton}
                    disabled={busy}
                    onClick={() => void dispatch(selectLocalProfile(profile.id))}
                    type="button"
                  >
                    {active
                      ? '本档已就位'
                      : profile.activeRunId
                        ? '续接此档'
                        : '选择此档'}
                  </button>
                  <div className={styles.ticketActions}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        beginRename(profile.id, profile.slot, profile.displayName)
                      }
                    >
                      改名
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `确定删除“${profile.displayName}”及其本地牌局吗？`,
                          )
                        ) {
                          void dispatch(deleteLocalProfile(profile.id));
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.emptySeal}>空</div>
                  <p className={styles.profileState}>尚未题名</p>
                  <button
                    className={styles.emptyButton}
                    disabled={busy}
                    onClick={() => beginCreate(slot)}
                    type="button"
                  >
                    在此建档
                  </button>
                </>
              )}
            </motion.article>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div>
          <span>当前戏主</span>
          <strong>{activeProfile?.displayName ?? '未选择'}</strong>
        </div>
        <label className={styles.seedField}>
          <span>试玩种子（可选）</span>
          <input
            value={seedText}
            maxLength={64}
            placeholder="留空则自动题种"
            onChange={(event) => setSeedText(event.target.value)}
          />
        </label>
        <button
          className={styles.startButton}
          disabled={!activeProfile || busy}
          onClick={startRun}
          type="button"
        >
          {busy
            ? '正在落印…'
            : activeProfile?.activeRunId
              ? '继续未完牌局'
              : '开始今夜试玩'}
        </button>
      </footer>

      {localError ? <p className={styles.localError}>{localError}</p> : null}

      <AnimatePresence>
        {editingSlot ? (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              className={styles.nameForm}
              onSubmit={submitProfile}
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.98 }}
            >
              <p>
                第 {editingSlot} 档 · {editingProfileId ? '改名' : '题名'}
              </p>
              <label htmlFor="profile-name">档案名</label>
              <input
                id="profile-name"
                maxLength={12}
                autoFocus
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlot(null);
                    setEditingProfileId(null);
                  }}
                >
                  收起
                </button>
                <button type="submit" disabled={!displayName.trim() || busy}>
                  {editingProfileId ? '确认改名' : '落印建档'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
