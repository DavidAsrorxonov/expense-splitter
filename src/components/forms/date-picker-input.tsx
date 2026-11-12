"use client";

import { useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateInputValue, formatDateInput, parseDateInput } from "@/lib/date-input";

type DatePickerInputProps = {
  id: string;
  name: string;
  defaultValue: string;
  today: string;
  resetKey: object;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function DatePickerInput({
  id, name, defaultValue, today, resetKey, disabled, invalid, describedBy,
}: DatePickerInputProps) {
  const currentDate = parseDateInput(today);
  const initialDate = parseDateInput(defaultValue);
  const initialValue = initialDate ? formatDateInput(initialDate) : defaultValue;
  const [selection, setSelection] = useState({ resetKey, value: initialValue, month: initialDate });
  const [openedKey, setOpenedKey] = useState<object | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const value = selection.resetKey === resetKey ? selection.value : initialValue;
  const date = parseDateInput(value);
  const month = (selection.resetKey === resetKey ? selection.month : initialDate) ?? currentDate;
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
          setSelection({ resetKey, value: text, month: parseDateInput(text) ?? month });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpenedKey(resetKey);
          }
        }}
      />
      <input type="hidden" name={name} value={dateInputValue(value)} disabled={disabled} />
      <Popover open={open} onOpenChange={(nextOpen) => setOpenedKey(nextOpen ? resetKey : null)}>
        <PopoverTrigger render={<Button type="button" variant="ghost" size="icon" />}
          disabled={disabled} aria-label="Choose expense date" className="absolute top-1/2 right-1 -translate-y-1/2">
          <CalendarIcon aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="w-auto p-0" aria-label="Choose expense date"
          initialFocus={false} finalFocus={inputRef}>
          <Calendar
            mode="single"
            required
            autoFocus
            selected={date}
            today={currentDate}
            month={month}
            onMonthChange={(nextMonth) => setSelection({ resetKey, value, month: nextMonth })}
            onSelect={(nextDate) => {
              if (!nextDate) return;
              setSelection({ resetKey, value: formatDateInput(nextDate), month: nextDate });
              setOpenedKey(null);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
