"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  dateInputValue,
  datePickerValue,
  formatDateInput,
  localDateString,
  parseDateInput,
} from "@/lib/date-input";

const subscribe = () => () => {};
const readLocalToday = () => localDateString(new Date());

type DatePickerInputProps = {
  id: string;
  name: string;
  defaultValue: string;
  today: string;
  resetKey: object;
  defaultToToday?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function DatePickerInput({
  id,
  name,
  defaultValue,
  today,
  resetKey,
  defaultToToday = false,
  disabled,
  invalid,
  describedBy,
}: DatePickerInputProps) {
  // Use the server value during hydration, then the browser's date. React reads
  // the snapshot again on renders, including each action reset after midnight.
  const localToday = useSyncExternalStore(
    subscribe,
    readLocalToday,
    () => today,
  );
  const currentDate = parseDateInput(localToday);
  const [selection, setSelection] = useState<{
    resetKey: object;
    value: string | null;
    month?: Date;
  }>({ resetKey, value: null });
  const [openedKey, setOpenedKey] = useState<object | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = datePickerValue(
    selection,
    resetKey,
    defaultToToday ? localToday : defaultValue,
  );
  const date = parseDateInput(value);
  const month =
    (selection.resetKey === resetKey ? selection.month : undefined) ??
    date ??
    currentDate;
  const open = openedKey === resetKey && !disabled;

  return (
    <div className="relative min-w-0">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        placeholder={currentDate ? formatDateInput(currentDate) : "YYYY-MM-DD"}
        required
        disabled={disabled}
        autoComplete="off"
        aria-invalid={Boolean(invalid)}
        aria-describedby={describedBy}
        className="pr-14"
        onChange={(event) => {
          const text = event.target.value;
          setSelection({
            resetKey,
            value: text,
            month: parseDateInput(text) ?? month,
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpenedKey(resetKey);
          }
        }}
      />
      <input
        type="hidden"
        name={name}
        value={dateInputValue(value)}
        disabled={disabled}
      />
      <Popover
        open={open}
        onOpenChange={(nextOpen) => setOpenedKey(nextOpen ? resetKey : null)}
      >
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="icon" />}
          disabled={disabled}
          aria-label="Choose expense date"
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <CalendarIcon aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-auto p-0"
          aria-label="Choose expense date"
          initialFocus={false}
          finalFocus={inputRef}
        >
          <Calendar
            mode="single"
            required
            autoFocus
            selected={date}
            today={currentDate}
            month={month}
            onMonthChange={(nextMonth) =>
              setSelection({
                resetKey,
                value: selection.resetKey === resetKey ? selection.value : null,
                month: nextMonth,
              })
            }
            onSelect={(nextDate) => {
              if (!nextDate) return;
              setSelection({
                resetKey,
                value: formatDateInput(nextDate),
                month: nextDate,
              });
              setOpenedKey(null);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
