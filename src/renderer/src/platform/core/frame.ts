/**
 * Calls `flush` once, on the next animation frame. A hidden window gets no frames, so a timer
 * stands in: whichever fires first wins.
 */
export function onNextFrame(flush: () => void): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    flush();
  };
  const frame = requestAnimationFrame(run);
  const timer = setTimeout(run, 50);
  return () => {
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
}
