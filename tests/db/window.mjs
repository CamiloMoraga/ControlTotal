const zone = "America/Santiago";
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function fields(date) {
  return Object.fromEntries(parts.formatToParts(date).filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
}

export function santiagoInstant(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = localAsUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const f = fields(new Date(instant));
    const renderedAsUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
    instant += localAsUtc - renderedAsUtc;
  }
  const f = fields(new Date(instant));
  if ([f.year, f.month, f.day, f.hour, f.minute].join("-") !==
      [year, month, day, hour, minute].join("-")) {
    throw new Error("Hora local inválida en America/Santiago");
  }
  return new Date(instant);
}

export function operationalWindow(closingDate, startTime, endTime) {
  const previousDate = new Date(`${closingDate}T00:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  return {
    start: santiagoInstant(previousDate.toISOString().slice(0, 10), startTime),
    end: santiagoInstant(closingDate, endTime),
  };
}

export function intersects(start, end, window) {
  return start < window.end && (end === null || end > window.start);
}
