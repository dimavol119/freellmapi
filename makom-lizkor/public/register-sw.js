// Registers the offline shell (kept in a file so the page can forbid all inline scripts via CSP).
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
}
