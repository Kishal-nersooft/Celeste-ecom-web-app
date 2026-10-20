"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 36;
const WHEEL_HEIGHT = ITEM_HEIGHT * 5;
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type Period = "AM" | "PM";

interface ScheduleDateTimePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  min: string;
  hint?: string | null;
  canClear?: boolean;
  clearLabel?: string;
  onConfirm: (value: string) => void;
  onClear?: () => void;
}

function parseLocal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateAt(day: Date, hour24: number, minute: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour24, minute, 0, 0);
}

function to24(hour12: number, period: Period) {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function from24(hour24: number): { hour12: number; period: Period } {
  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isDayDisabled(day: Date, min: Date) {
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return end.getTime() < min.getTime();
}

function slotAllowed(day: Date, hour12: number, minute: number, period: Period, min: Date) {
  return dateAt(day, to24(hour12, period), minute).getTime() >= min.getTime();
}

function initialDraft(value: string, minValue: string) {
  const min = parseLocal(minValue) ?? new Date();
  const parsed = value ? parseLocal(value) : null;
  const base = parsed && parsed.getTime() >= min.getTime() ? parsed : min;
  const snapped = new Date(base);
  snapped.setSeconds(0, 0);
  const remainder = snapped.getMinutes() % 5;
  if (remainder !== 0) snapped.setMinutes(snapped.getMinutes() + (5 - remainder));
  if (snapped.getTime() < min.getTime()) return new Date(min);
  return snapped;
}

function WheelColumn<T extends string | number>({
  items,
  value,
  onChange,
  ariaLabel,
  format,
  className,
}: {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  format: (value: T) => string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ignore = useRef(false);
  const ownCommit = useRef(false);
  const valueRef = useRef(value);
  const itemsRef = useRef(items);
  const commitTimer = useRef<number | null>(null);
  const itemsKey = items.join("|");
  const [scrollTop, setScrollTop] = useState(0);
  valueRef.current = value;
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    const list = itemsRef.current;
    if (!el || list.length === 0) return;
    if (ownCommit.current) {
      ownCommit.current = false;
      setScrollTop(el.scrollTop);
      return;
    }
    const index = list.findIndex((item) => item === value);
    const safeIndex = index >= 0 ? index : 0;
    const top = safeIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - top) > 1) {
      ignore.current = true;
      el.scrollTop = top;
    }
    setScrollTop(top);
    const frame = requestAnimationFrame(() => {
      ignore.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [value, itemsKey]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        "h-full min-w-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      style={{
        scrollSnapType: "y mandatory",
        paddingTop: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
        paddingBottom: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
      }}
      onScroll={(event) => {
        const top = event.currentTarget.scrollTop;
        setScrollTop(top);
        if (ignore.current) return;
        if (commitTimer.current) window.clearTimeout(commitTimer.current);
        const el = event.currentTarget;
        commitTimer.current = window.setTimeout(() => {
          const list = itemsRef.current;
          const index = Math.round(el.scrollTop / ITEM_HEIGHT);
          const next = list[Math.max(0, Math.min(list.length - 1, index))];
          if (next !== undefined && next !== valueRef.current) {
            ownCommit.current = true;
            onChange(next);
          }
        }, 80);
      }}
      onKeyDown={(event) => {
        const index = items.findIndex((item) => item === valueRef.current);
        if (event.key === "ArrowDown" && items[index + 1] !== undefined) {
          event.preventDefault();
          onChange(items[index + 1]);
        } else if (event.key === "ArrowUp" && items[index - 1] !== undefined) {
          event.preventDefault();
          onChange(items[index - 1]);
        }
      }}
    >
      {items.map((item, index) => {
        const distance = Math.abs(index * ITEM_HEIGHT - scrollTop) / ITEM_HEIGHT;
        const opacity = Math.max(0.22, 1 - distance * 0.42);
        const selected = item === value;
        return (
          <button
            key={String(item)}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(item)}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center", opacity }}
            className={cn(
              "flex w-full items-center justify-center text-[22px] tabular-nums text-neutral-900",
              selected ? "font-semibold" : "font-medium"
            )}
          >
            {format(item)}
          </button>
        );
      })}
    </div>
  );
}

function PickerBody({
  value,
  min,
  hint,
  canClear,
  clearLabel,
  onConfirm,
  onClear,
  onCancel,
}: {
  value: string;
  min: string;
  hint?: string | null;
  canClear?: boolean;
  clearLabel: string;
  onConfirm: (value: string) => void;
  onClear?: () => void;
  onCancel: () => void;
}) {
  const minDate = useMemo(() => parseLocal(min) ?? new Date(), [min]);
  const [draft, setDraft] = useState(() => initialDraft(value, min));
  const [viewMonth, setViewMonth] = useState(
    () => new Date(draft.getFullYear(), draft.getMonth(), 1)
  );

  const parts = from24(draft.getHours());
  const minute = MINUTES.reduce((closest, option) =>
    Math.abs(option - draft.getMinutes()) < Math.abs(closest - draft.getMinutes()) ? option : closest
  );

  const hours = HOURS.filter((hour) => MINUTES.some((option) => slotAllowed(draft, hour, option, parts.period, minDate)));
  const minutes = MINUTES.filter((option) => slotAllowed(draft, parts.hour12, option, parts.period, minDate));
  const periods = (["AM", "PM"] as const).filter((period) =>
    HOURS.some((hour) => MINUTES.some((option) => slotAllowed(draft, hour, option, period, minDate)))
  );

  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const next: Array<Date | null> = [];
    for (let i = 0; i < firstWeekday; i += 1) next.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) next.push(new Date(year, month, day));
    while (next.length % 7 !== 0) next.push(null);
    return next;
  }, [viewMonth]);

  const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canGoPrev = viewMonth.getTime() > minMonth.getTime();
  const today = new Date();
  const tooSoon = draft.getTime() < minDate.getTime();

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const summary = draft.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const selectDay = (day: Date) => {
    if (isDayDisabled(day, minDate)) return;
    setDraft((current) => {
      const next = dateAt(day, current.getHours(), current.getMinutes());
      return next.getTime() < minDate.getTime() ? new Date(minDate) : next;
    });
  };

  const selectHour = (hour12: number) => {
    setDraft((current) => {
      const period = from24(current.getHours()).period;
      const currentMinute = MINUTES.reduce((closest, option) =>
        Math.abs(option - current.getMinutes()) < Math.abs(closest - current.getMinutes()) ? option : closest
      );
      const allowedMinute =
        MINUTES.find((option) => option >= currentMinute && slotAllowed(current, hour12, option, period, minDate)) ??
        MINUTES.find((option) => slotAllowed(current, hour12, option, period, minDate)) ??
        currentMinute;
      const next = dateAt(current, to24(hour12, period), allowedMinute);
      return next.getTime() < minDate.getTime() ? new Date(minDate) : next;
    });
  };

  const selectMinute = (nextMinute: number) => {
    setDraft((current) => {
      const { hour12, period } = from24(current.getHours());
      const next = dateAt(current, to24(hour12, period), nextMinute);
      return next.getTime() < minDate.getTime() ? new Date(minDate) : next;
    });
  };

  const selectPeriod = (period: Period) => {
    setDraft((current) => {
      const { hour12 } = from24(current.getHours());
      const currentMinute = MINUTES.reduce((closest, option) =>
        Math.abs(option - current.getMinutes()) < Math.abs(closest - current.getMinutes()) ? option : closest
      );
      const hour =
        HOURS.find((option) => option === hour12 && MINUTES.some((minuteOption) => slotAllowed(current, option, minuteOption, period, minDate))) ??
        HOURS.find((option) => MINUTES.some((minuteOption) => slotAllowed(current, option, minuteOption, period, minDate))) ??
        hour12;
      const allowedMinute =
        MINUTES.find((option) => option >= currentMinute && slotAllowed(current, hour, option, period, minDate)) ??
        MINUTES.find((option) => slotAllowed(current, hour, option, period, minDate)) ??
        currentMinute;
      const next = dateAt(current, to24(hour, period), allowedMinute);
      return next.getTime() < minDate.getTime() ? new Date(minDate) : next;
    });
  };

  return (
    <div className="bg-[#f2f2f7] text-neutral-900">
      <div className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center px-2 pb-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="justify-self-start rounded-full px-2 py-1 text-[17px] text-[#007AFF] active:opacity-60"
        >
          Cancel
        </button>
        <DialogTitle className="text-center text-[17px] font-semibold tracking-tight">Schedule</DialogTitle>
        <span />
      </div>
      <DialogDescription className="sr-only">Choose a date and time for this order.</DialogDescription>

      {hint && <p className="px-5 pb-3 text-center text-[13px] leading-snug text-neutral-500">{hint}</p>}

      <div className="mx-3 rounded-[22px] bg-white px-3 pb-3 pt-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-[17px] font-semibold tracking-tight">{monthLabel}</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoPrev}
              onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#007AFF] transition-colors hover:bg-[#007AFF]/10 disabled:text-neutral-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#007AFF] transition-colors hover:bg-[#007AFF]/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 pb-1">
          {WEEKDAYS.map((day, index) => (
            <div key={`${day}-${index}`} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} />;
            const disabled = isDayDisabled(day, minDate);
            const selected = sameDay(day, draft);
            const isToday = sameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => selectDay(day)}
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[15px] transition-transform active:scale-90",
                  selected && "bg-[#007AFF] font-semibold text-white shadow-sm",
                  !selected && isToday && "font-semibold text-[#007AFF] ring-1 ring-[#007AFF]/40",
                  !selected && !disabled && !isToday && "text-neutral-900 hover:bg-neutral-100",
                  disabled && "text-neutral-300"
                )}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-3 mt-3 rounded-[22px] bg-white px-2 pb-2 pt-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-end justify-center gap-1 pb-1">
          <span className="text-[34px] font-semibold leading-none tracking-tight tabular-nums">
            {parts.hour12}:{String(minute).padStart(2, "0")}
          </span>
          <span className="mb-0.5 text-[15px] font-semibold text-neutral-400">{parts.period}</span>
        </div>
        <div className="text-center text-[13px] text-neutral-500">{summary}</div>

        <div className="relative mt-2 h-[180px]">
          <div className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-9 -translate-y-1/2 rounded-xl bg-[#f2f2f7]" />
          <div
            className="absolute inset-0 z-10 flex"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)",
              maskImage: "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)",
            }}
          >
            <WheelColumn
              items={hours.length > 0 ? hours : [parts.hour12]}
              value={hours.includes(parts.hour12) ? parts.hour12 : hours[0] ?? parts.hour12}
              onChange={selectHour}
              ariaLabel="Hour"
              format={(hour) => String(hour)}
            />
            <div className="flex w-4 items-center justify-center text-[22px] font-semibold text-neutral-900">:</div>
            <WheelColumn
              items={minutes.length > 0 ? minutes : [minute]}
              value={minutes.includes(minute) ? minute : minutes[0] ?? minute}
              onChange={selectMinute}
              ariaLabel="Minute"
              format={(option) => String(option).padStart(2, "0")}
            />
            <WheelColumn
              items={periods.length > 0 ? [...periods] : [parts.period]}
              value={periods.includes(parts.period) ? parts.period : periods[0] ?? parts.period}
              onChange={selectPeriod}
              ariaLabel="AM or PM"
              format={(period) => period}
              className="max-w-[4.5rem]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {tooSoon && <p className="text-center text-xs text-red-600">Choose a later time.</p>}
        <button
          type="button"
          disabled={tooSoon}
          onClick={() => onConfirm(toLocalInput(draft))}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#007AFF] text-[17px] font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
        >
          Set schedule
        </button>
        {canClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-10 w-full items-center justify-center text-[15px] font-medium text-[#007AFF] active:opacity-60"
          >
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScheduleDateTimePicker({
  open,
  onOpenChange,
  value,
  min,
  hint,
  canClear = false,
  clearLabel = "Deliver as soon as possible",
  onConfirm,
  onClear,
}: ScheduleDateTimePickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        mobileAsSheet
        sheetAutoHeight
        sheetMinRatio={0.78}
        sheetMaxRatio={0.94}
        onDismiss={() => onOpenChange(false)}
        className="max-h-[92vh] gap-0 overflow-x-hidden overflow-y-auto border-0 bg-[#f2f2f7] p-0 shadow-2xl max-lg:max-h-none max-lg:gap-0 max-lg:overflow-hidden max-lg:border-0 max-lg:bg-[#f2f2f7] max-lg:p-0 sm:max-w-[400px] lg:max-w-[400px] lg:rounded-[28px] lg:bg-[#f2f2f7]"
      >
        {open && (
          <PickerBody
            key={`${value}|${min}`}
            value={value}
            min={min}
            hint={hint}
            canClear={canClear}
            clearLabel={clearLabel}
            onCancel={() => onOpenChange(false)}
            onConfirm={(next) => {
              onConfirm(next);
              onOpenChange(false);
            }}
            onClear={() => {
              onClear?.();
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
