let isLogging = false;
let stats = {
  clicks: 0,
  keystrokes: 0,
  idleTime: 0,
  accumulatedText: '',
  lastActivityTime: Date.now()
};

let globalKeydownListener;
let globalClickListener;
let idleCheckInterval;

export function startLogging() {
  isLogging = true;
  stats = {
    clicks: 0,
    keystrokes: 0,
    idleTime: 0,
    accumulatedText: '',
    lastActivityTime: Date.now()
  };

  globalKeydownListener = (event) => {
    if (isLogging) {
      stats.keystrokes++;
      stats.lastActivityTime = Date.now();
      const key = event.key;
      if (key === " ") {
        stats.accumulatedText += " ";
      } else if (key.length === 1) {
        stats.accumulatedText += key;
      }
    }
  };

  globalClickListener = () => {
    if (isLogging) {
      stats.clicks++;
      stats.lastActivityTime = Date.now();
    }
  };

  idleCheckInterval = setInterval(() => {
    if (isLogging) {
      const currentTime = Date.now();
      const idleTime = Math.floor((currentTime - stats.lastActivityTime) / 60000);
      if (idleTime >= 1) {
        stats.idleTime = idleTime;
      } else {
        stats.idleTime = 0;
      }
    }
  }, 60000);

  window.addEventListener('keydown', globalKeydownListener);
  window.addEventListener('click', globalClickListener);
}

export function stopLogging() {
  isLogging = false;
  window.removeEventListener('keydown', globalKeydownListener);
  window.removeEventListener('click', globalClickListener);
  clearInterval(idleCheckInterval);
}

export function getStats() {
  return { ...stats };
}