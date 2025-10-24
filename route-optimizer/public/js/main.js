document.addEventListener('DOMContentLoaded', () => {
  const sidePanel = document.querySelector('.side-panel');
  const hamburger = document.getElementById('hamburger');
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');

  if (hamburger && sidePanel) {
    const togglePanel = (open) => {
      sidePanel.classList.toggle('open', open);
      hamburger.classList.toggle('open', open);
      // shift hamburger so it's accessible while panel is open
      hamburger.classList.toggle('shift', open);
    };

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel(!sidePanel.classList.contains('open'));
    });

    // close on outside click
    document.addEventListener('click', () => togglePanel(false));
    sidePanel.addEventListener('click', (e) => e.stopPropagation());
  }

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => { e.stopPropagation(); profileMenu.classList.toggle('show'); });
    document.addEventListener('click', () => profileMenu.classList.remove('show'));
  }

  // close panel when any side-item clicked
  document.querySelectorAll('.side-item').forEach(item => {
    item.addEventListener('click', () => {
      if (sidePanel) {
        sidePanel.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open','shift');
      }
    });
  });
});
