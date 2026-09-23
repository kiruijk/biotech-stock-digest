// Turns free-text catalyst timings ("Q3 2026", "1H 2027", "Mid-2027", "October 15, 2026",
// "2026–2027") into the latest date the event could fall on. Returns null for timings with
// no date ("Ongoing", "Each quarter", "After 78-week dosing").

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const endOfMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0));

function parseTimingEnd(timing) {
  if (!timing) return null;
  let text = String(timing);
  const ends = [];
  const take = (re, toDate) => {
    text = text.replace(re, (...m) => {
      ends.push(toDate(m));
      return ' ';
    });
  };

  // Specific day: "October 15, 2026", "Sep 30 2026"
  take(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d\d)\b/gi,
    m => new Date(Date.UTC(+m[3], MONTHS.indexOf(m[1].toLowerCase()), +m[2])));
  // Month: "September 2026"
  take(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d\d)\b/gi,
    m => endOfMonth(+m[2], MONTHS.indexOf(m[1].toLowerCase())));
  // Quarter / half: "Q3 2026", "3Q26", "1H 2027", "2H26"
  take(/\bQ([1-4])\s*'?(20)?(\d\d)\b/gi, m => endOfMonth(2000 + +m[3], +m[1] * 3 - 1));
  take(/\b([1-4])Q\s*'?(20)?(\d\d)\b/gi, m => endOfMonth(2000 + +m[3], +m[1] * 3 - 1));
  take(/\b([12])H\s*'?(20)?(\d\d)\b/gi, m => endOfMonth(2000 + +m[3], m[1] === '1' ? 5 : 11));
  // Qualified years: "Mid-2027", "Early 2027", "Late 2026", "End of 2026", "YE2026", "year-end 2026"
  take(/\b(early)[\s-]+(20\d\d)\b/gi, m => endOfMonth(+m[2], 2));
  take(/\bmid[\s-]+(20\d\d)\b/gi, m => endOfMonth(+m[1], 5));
  take(/\b(late|end of|year[\s-]?end|ye)[\s-]*(20\d\d)\b/gi, m => endOfMonth(+m[2], 11));
  // Plain years: "2026", "2026–2027"
  take(/\b(20\d\d)\b/g, m => endOfMonth(+m[1], 11));

  return ends.length ? new Date(Math.max(...ends)) : null;
}

// True when the catalyst's latest possible date is before today
function isPast(timing, now = new Date()) {
  const end = parseTimingEnd(timing);
  if (!end) return false;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return end < today;
}

module.exports = { parseTimingEnd, isPast };
