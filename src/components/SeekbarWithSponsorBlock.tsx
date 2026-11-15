import React, { useRef, useState } from 'react';
import {
  SponsorBlockSegment,
  SponsorCategory,
  SponsorCategorySetting,
} from '../types/music';
import { formatSeconds } from '../utils/materialYou';

interface SeekbarProps {
  currentTime: number;
  duration: number;
  segments: SponsorBlockSegment[];
  categorySettings: Record<SponsorCategory, SponsorCategorySetting>;
  onSeek: (newTime: number) => void;
  compact?: boolean;
}

export const SeekbarWithSponsorBlock: React.FC<SeekbarProps> = ({
  currentTime,
  duration,
  segments,
  categorySettings,
  onSeek,
  compact = false,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [hoveredSegment, setHoveredSegment] =
    useState<SponsorBlockSegment | null>(null);

  const effectiveDuration = Math.max(duration || 1, 1);
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentTime / effectiveDuration) * 100)
  );

  const visibleSegments = segments.filter((seg) => {
    const setting = categorySettings[seg.category];
    return !setting || setting.behavior !== 'off';
  });

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = relX / rect.width;
    const t = ratio * effectiveDuration;
    setHoverTime(t);
    setHoverPercent(ratio * 100);

    const matchSeg =
      visibleSegments.find((s) => t >= s.startTime && t <= s.endTime) || null;
    setHoveredSegment(matchSeg);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = relX / rect.width;
    onSeek(ratio * effectiveDuration);
  };

  return (
    <div className="w-full select-none">
      <div
        ref={barRef}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => {
          setHoverTime(null);
          setHoveredSegment(null);
        }}
        onClick={handleClick}
        className={`relative w-full cursor-pointer group flex items-center ${
          compact ? 'h-4' : 'h-6'
        }`}
      >
        {/* Hover Tooltip */}
        {hoverTime !== null && (
          <div
            style={{
              left: `${Math.min(92, Math.max(8, hoverPercent))}%`,
            }}
            className="absolute -top-9 -translate-x-1/2 z-30 pointer-events-none px-2.5 py-1 rounded-m3-sm bg-md-surface-container-highest border border-md-outline-variant text-xs font-medium text-md-on-surface shadow-lg whitespace-nowrap flex items-center gap-1.5"
          >
            <span className="font-mono-num font-semibold text-md-primary">
              {formatSeconds(hoverTime)}
            </span>
            {hoveredSegment && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-black"
                style={{
                  backgroundColor:
                    categorySettings[hoveredSegment.category]?.color || '#ff2a85',
                }}
              >
                {categorySettings[hoveredSegment.category]?.label ||
                  hoveredSegment.category}{' '}
                ({formatSeconds(hoveredSegment.startTime)}–
                {formatSeconds(hoveredSegment.endTime)})
              </span>
            )}
          </div>
        )}

        {/* Base Track */}
        <div
          className={`relative w-full overflow-hidden rounded-full bg-md-surface-container-highest transition-all duration-150 ${
            compact
              ? 'h-1.5 group-hover:h-2.5'
              : 'h-2 group-hover:h-3'
          }`}
        >
          {/* Elapsed Progress Fill */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="absolute inset-y-0 left-0 bg-md-primary rounded-full transition-[width] duration-75"
          />

          {/* SponsorBlock Colored Segment Overlays */}
          {visibleSegments.map((seg) => {
            const segDurationBase =
              seg.videoDuration > 0 ? seg.videoDuration : effectiveDuration;
            const leftPct = Math.min(
              100,
              Math.max(0, (seg.startTime / segDurationBase) * 100)
            );
            const widthPct = Math.min(
              100 - leftPct,
              Math.max(0.8, ((seg.endTime - seg.startTime) / segDurationBase) * 100)
            );
            const color =
              categorySettings[seg.category]?.color || '#ff2a85';

            return (
              <div
                key={seg.uuid || `${seg.category}-${seg.startTime}`}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: color,
                }}
                title={`SponsorBlock: ${
                  categorySettings[seg.category]?.label || seg.category
                } (${formatSeconds(seg.startTime)} - ${formatSeconds(
                  seg.endTime
                )})`}
                className="absolute inset-y-0 z-10 opacity-95 shadow-sm"
              />
            );
          })}
        </div>

        {/* Playhead Thumb */}
        <div
          style={{ left: `${progressPercent}%` }}
          className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-md-primary ring-4 ring-md-primary/25 shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
        />
      </div>
    </div>
  );
};
