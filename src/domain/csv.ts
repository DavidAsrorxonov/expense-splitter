export function toCsv(rows: string[][]): string {
  return rows
    .map(
      (row) =>
        row
          .map((field) =>
            /[",\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field,
          )
          .join(",") + "\r\n",
    )
    .join("");
}

export function neutralizeFormula(text: string): string {
  return /^[-=+@\t\r]/.test(text) ? "'" + text : text;
}
