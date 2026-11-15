import React from 'react';
import {
  X,
  Palette,
  Moon,
  Smartphone,
  Monitor,
  Globe,
  Download,
  Upload,
  Check,
  Sparkles,
} from 'lucide-react';
import { MATERIAL_PRESET_THEMES } from '../utils/materialYou';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedThemeId: string;
  onSelectTheme: (themeId: string, hue: number | null) => void;
  sleepTimerMinutes: number | null;
  onSetSleepTimer: (mins: number | null) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsAndCrossPlatformModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedThemeId,
  onSelectTheme,
  sleepTimerMinutes,
  onSetSleepTimer,
  onExportBackup,
  onImportBackup,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-m3-xl bg-md-surface-container border border-md-outline-variant/40 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-md-surface-container-high border-b border-md-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-md-primary" />
            <h2 className="text-base font-extrabold text-md-on-surface">
              Material You Theme, Sleep Timer & Cross-Platform Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-md-surface-container-highest text-md-on-surface-variant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Material You (Material 3) Expressive Palette */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-md-primary">
              <Palette className="w-4 h-4" />
              <span>Material You (M3 Expressive) Color Engine</span>
            </div>
            <p className="text-xs text-md-on-surface-variant">
              Extracts dominant tonal palettes dynamically from the currently playing song&apos;s album artwork or uses your chosen Material 3 seed color.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {MATERIAL_PRESET_THEMES.map((t) => {
                const active = selectedThemeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTheme(t.id, t.hue)}
                    className={`p-3 rounded-m3-lg border text-left transition-all flex items-center justify-between ${
                      active
                        ? 'bg-md-primary-container/50 border-md-primary text-md-on-surface shadow-sm'
                        : 'bg-md-surface-container-high border-md-outline-variant/30 text-md-on-surface-variant hover:text-md-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 border border-white/20"
                        style={{ background: t.preview }}
                      />
                      <span className="text-xs font-bold truncate">
                        {t.name}
                      </span>
                    </div>
                    {active && (
                      <Check className="w-4 h-4 text-md-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Sleep Timer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-md-primary">
              <Moon className="w-4 h-4" />
              <span>Sleep Timer</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Off', val: null },
                { label: '15 min', val: 15 },
                { label: '30 min', val: 30 },
                { label: '45 min', val: 45 },
                { label: '60 min', val: 60 },
              ].map((opt) => {
                const active = sleepTimerMinutes === opt.val;
                return (
                  <button
                    key={opt.label}
                    onClick={() => onSetSleepTimer(opt.val)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      active
                        ? 'bg-md-primary text-md-on-primary shadow-sm'
                        : 'bg-md-surface-container-high text-md-on-surface-variant hover:text-md-on-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SimpMusic Backup & Restore */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-md-primary">
              SimpMusic Library & SponsorBlock Backup (.json)
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onExportBackup}
                className="px-4 py-2 rounded-m3-md bg-md-secondary-container text-md-on-secondary-container text-xs font-bold flex items-center gap-2 hover:opacity-90"
              >
                <Download className="w-4 h-4" />
                <span>Export Backup JSON</span>
              </button>
              <label className="px-4 py-2 rounded-m3-md bg-md-surface-container-high hover:bg-md-surface-container-highest text-md-on-surface text-xs font-bold flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import Backup JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 4. Cross-Platform Architecture Targets */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-md-primary">
              Cross-Platform Targets Included in Workspace
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-m3-lg bg-md-surface-container-high border border-md-outline-variant/25 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-md-on-surface">
                  <Globe className="w-4 h-4 text-md-primary" />
                  <span>Web & PWA</span>
                </div>
                <p className="text-[11px] text-md-on-surface-variant">
                  Installable via <code className="text-md-primary">manifest.webmanifest</code> with MediaSession OS lock-screen controls.
                </p>
              </div>

              <div className="p-3.5 rounded-m3-lg bg-md-surface-container-high border border-md-outline-variant/25 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-md-on-surface">
                  <Smartphone className="w-4 h-4 text-md-primary" />
                  <span>Android & iOS</span>
                </div>
                <p className="text-[11px] text-md-on-surface-variant">
                  Configured via <code className="text-md-primary">capacitor.config.json</code> with adaptive mobile navigation bar.
                </p>
              </div>

              <div className="p-3.5 rounded-m3-lg bg-md-surface-container-high border border-md-outline-variant/25 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-md-on-surface">
                  <Monitor className="w-4 h-4 text-md-primary" />
                  <span>Desktop Native</span>
                </div>
                <p className="text-[11px] text-md-on-surface-variant">
                  Configured via <code className="text-md-primary">electron/main.cjs</code> for Windows, macOS, and Linux.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
