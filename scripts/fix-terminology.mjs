/**
 * Еднократна корекција на терминологијата во мастер-работната книга.
 *
 * „веб-страна“ не е правилна македонска форма. Го заменуваме со „мрежно место“
 * (препорачаниот термин на Управа за јазик за цело мрежно место, не поединечна
 * страница). Формите мора да се редат од најдолга кон најкратка, инаку
 * „веб-страни“ ќе го „изеде“ прифатливото „веб-страници“.
 *
 * Се чуваат: капители („Веб-страната“ → „Мрежното место“), richText-сегменти
 * и сите други ќелии. Работи на копие — книгата се презапишува на истата патека.
 */
import ExcelJS from 'exceljs';

const WORKBOOK = 'master_biblioteki_mk.xlsx';

// Најдолги први — редоследот е критичен.
const RULES = [
  [/веб-страната/giu, 'мрежното место'],
  [/веб-страните/giu, 'мрежните места'],
  [/веб-страни(?!ц)/giu, 'мрежни места'], // (?!ц) ѝ штити на „веб-страници“
  [/веб-страна/giu, 'мрежно место'],
];

/** Го задржува капителот на првиот знак ако изворот бил со капител. */
function convert(text) {
  let out = text;
  for (const [re, to] of RULES) {
    out = out.replace(re, (match) => {
      const first = match.charAt(0);
      if (first === first.toUpperCase() && first !== first.toLowerCase()) {
        return to.charAt(0).toUpperCase() + to.slice(1);
      }
      return to;
    });
  }
  return out;
}

function convertValue(value) {
  if (typeof value === 'string') return convert(value);
  if (value && typeof value === 'object' && Array.isArray(value.richText)) {
    // Сегментите се претворае посебно за да не се расипе форматирањето,
    // но замената е дозволена само во внатрешноста на сегмент — не помеѓу нив.
    let changed = false;
    const richText = value.richText.map((seg) => {
      const next = convert(seg.text ?? '');
      if (next !== (seg.text ?? '')) {
        changed = true;
        return { ...seg, text: next };
      }
      return seg;
    });
    return changed ? { ...value, richText } : value;
  }
  return value;
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(WORKBOOK);

let cells = 0;
let sheets = new Set();
wb.eachSheet((sheet) => {
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const before = cell.value;
      const after = convertValue(before);
      if (after !== before) {
        cell.value = after;
        cells += 1;
        sheets.add(sheet.name);
      }
    });
  });
});

if (cells === 0) {
  console.log('Нема што да се менува — книгата е веќе исправена.');
  process.exit(0);
}

await wb.xlsx.writeFile(WORKBOOK);
console.log(`Преименувани ќелии: ${cells}`);
for (const name of sheets) console.log(`  • ${name}`);
