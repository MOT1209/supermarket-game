// Coalesce frequent save requests into a single localStorage write.
export function createDebouncedSave(write, delay = 250) {
  let timer = null;
  let pending = false;

  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = false;
  }

  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!pending) return false;
    pending = false;
    write();
    return true;
  }

  function schedule() {
    pending = true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  }

  return {
    schedule,
    flush,
    cancel,
    get pending() {
      return pending;
    }
  };
}
