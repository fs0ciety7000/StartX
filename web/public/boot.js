// Applied before first paint so the saved theme never flashes. External file: the CSP has no 'unsafe-inline'.
(function () {
  try {
    var raw = localStorage.getItem('startx:config');
    var th = raw ? JSON.parse(raw).settings.theme : null;
    if (th === 'obsidian' || th === 'basalt' || th === 'travertine') document.documentElement.dataset.theme = th;
  } catch (e) {}
})();
