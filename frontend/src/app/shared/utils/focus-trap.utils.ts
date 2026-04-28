const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(element: HTMLElement): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const focusFirst = () => {
    const focusable = element.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length) focusable[0].focus();
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  element.addEventListener('keydown', onKeydown);
  setTimeout(focusFirst, 0);

  return () => {
    element.removeEventListener('keydown', onKeydown);
    previouslyFocused?.focus();
  };
}
