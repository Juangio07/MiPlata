(() => {
  const syncGoalIconControls = () => {
    const modal = document.getElementById('modal-savings-goal');
    if (!modal) return;

    const hasImage = Boolean(modal.querySelector('#goal-img-preview img'));
    modal.querySelectorAll('.goal-icon-choice').forEach((button) => {
      button.disabled = hasImage;
      button.setAttribute('aria-disabled', String(hasImage));
      button.classList.toggle('opacity-40', hasImage);
      button.classList.toggle('cursor-not-allowed', hasImage);
      button.classList.toggle('cursor-pointer', !hasImage);
      button.title = hasImage ? 'La foto reemplaza el icono' : 'Elegir icono';
    });
  };

  const observeGoalModal = () => {
    const modal = document.getElementById('modal-savings-goal');
    if (!modal) return;

    syncGoalIconControls();
    new MutationObserver(syncGoalIconControls).observe(modal, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeGoalModal, { once: true });
  } else {
    observeGoalModal();
  }
})();
