/** Insert text at the textarea caret (or replace the current selection). */
export function insertAtCursor(
  el: HTMLTextAreaElement | null | undefined,
  value: string,
  insert: string,
  setValue: (next: string) => void,
) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? start;
  const next = value.slice(0, start) + insert + value.slice(end);
  setValue(next);
  const pos = start + insert.length;
  requestAnimationFrame(() => {
    if (!el) return;
    try {
      el.focus();
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
  });
}
