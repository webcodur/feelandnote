/** File answers belong to one captured session and question. A final LF commits the UTF-8 line. */
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

export function fileAnswerStream(directory, { interval = 800, retryEvery = 3 } = {}) {
  const root = path.resolve(directory);
  fs.mkdirSync(root, { recursive: true });
  const stream = new Readable({ read() {} });
  let binding = null, readId = () => null, inFlight = null, ticks = 0, stopped = false;
  const completed = new Set();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const send = (command) => { if (!stopped && !stream.destroyed) stream.push(JSON.stringify(command) + '\n'); };
  const timer = setInterval(() => {
    if (stopped || !binding) return;
    ticks++;
    const captureFile = path.join(binding.directory, 'capture.txt');
    if (fs.existsSync(captureFile)) {
      try { fs.unlinkSync(captureFile); send({ session: binding.session, capture: true }); } catch { /* Retry a locked file on the next tick. */ }
    }
    const challenge = readId();
    // Suspension during frame loss never changes the answer's original question number.
    if (!Number.isSafeInteger(challenge)) return;
    if (inFlight && inFlight.challenge !== challenge) inFlight = null;
    if (completed.has(challenge)) return;
    if (!inFlight) {
      const file = path.join(binding.directory, 'answer-' + challenge + '.txt');
      let bytes, line;
      try {
        bytes = fs.readFileSync(file);
        if (!bytes.length || bytes.at(-1) !== 10) return; // No commit newline: the write is unfinished.
        line = decoder.decode(bytes);
      } catch { return; } // Missing file or incomplete UTF-8: do not submit.
      const answer = line.replace(/\r?\n$/, '').trim();
      if (!answer || answer.length > 50 || /[\r\n]/.test(answer)) return;
      inFlight = { session: binding.session, challenge, answer, file };
    } else if (ticks % retryEvery !== 0) return;
    send({ session: inFlight.session, challenge: inFlight.challenge, answer: inFlight.answer });
  }, interval);
  timer.unref?.();
  const stop = () => {
    if (stopped) return;
    stopped = true; clearInterval(timer); inFlight = null;
    if (!stream.destroyed) stream.push(null);
  };
  stream.once('close', stop);
  return {
    stream, stop,
    // Existing callers pass this function immediately after starting their session.
    useId: (fn) => {
      if (binding) throw new Error('A file answer stream cannot bind another challenge session.');
      if (typeof fn !== 'function') throw new Error('The current challenge session binding is required.');
      const dir = path.resolve(fn.directory ?? root);
      if (!/^challenge-[\w-]+$/.test(fn.session ?? '') || path.dirname(dir) !== root || path.basename(dir) !== fn.session) throw new Error('The current challenge session answer directory is required.');
      binding = { session: fn.session, directory: dir }; readId = fn;
    },
    settle: (challenge = inFlight?.challenge, session = inFlight?.session) => {
      if (!inFlight || inFlight.challenge !== challenge || inFlight.session !== session) return;
      completed.add(challenge);
      try { fs.renameSync(inFlight.file, inFlight.file + '.done'); } catch { /* Completed IDs cannot be sent again even when renaming is blocked. */ }
      inFlight = null;
    },
  };
}

/** The diagnostic log is never used as a pending answer identity. */
export function challengeLogger(dir, { log = console.log, onSubmitted = () => {} } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'challenge.log');
  return (line) => {
    log(line);
    try { fs.appendFileSync(file, line + '\n'); } catch {}
    try {
      const parsed = JSON.parse(line);
      if (Number.isSafeInteger(parsed.submitted)) onSubmitted(parsed.submitted, parsed.session);
    } catch { /* Plain diagnostic lines do not acknowledge an answer. */ }
  };
}
