(() => {
  const counter = document.getElementById('completedCount');
  const certificate = document.getElementById('certificateButton');
  if (!counter || !certificate) return;
  const syncCertificate = () => {
    const match = String(counter.textContent || '').match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return;
    const done = Number(match[1]);
    const total = Number(match[2]);
    if (total > 0 && done >= total) certificate.classList.remove('is-hidden');
  };
  new MutationObserver(syncCertificate).observe(counter, { childList: true, subtree: true, characterData: true });
  syncCertificate();
})();
