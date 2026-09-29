// Door controls and scene transition.
window.makeDuckDoor = function (container, args) {
  const button = document.createElement('button');
  button.className = 'duck-door';
  button.type = 'button';
  button.setAttribute('aria-label', args.label);
  button.innerHTML = '<img src="duck-guide.svg" alt=""><span><small>Urmează rățușca</small>' +
    args.label + '</span><span class="door-arrow" aria-hidden="true">↑</span>';
  button.addEventListener('click', event => {
    event.stopPropagation();
    window.travel(args.scene, event);
  });
  button.addEventListener('pointerdown', event => event.stopPropagation());
  container.appendChild(button);
};

const journey = document.createElement('div');
journey.id = 'duck-journey';
journey.setAttribute('aria-hidden', 'true');
journey.innerHTML = `<div class="journey-focus" aria-hidden="true"></div>
  <div class="journey-error-state">
    <div class="journey-error" hidden>Nu am putut deschide camera. Încearcă din nou.</div>
    <button class="journey-dismiss" hidden>Înapoi la tur</button>
  </div>`;
document.getElementById('panorama')?.appendChild(journey);
const announcement = document.createElement('div');
announcement.setAttribute('role', 'status');
announcement.setAttribute('aria-live', 'polite');
announcement.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
document.body.appendChild(announcement);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let travelling = false;
window.travel = async function (destination, triggerEvent) {
  if (travelling) return;
  travelling = true;
  const viewer = window.tourViewer;
  const panorama = document.getElementById('panorama');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const source = viewer.getScene();
  const sourceView = { pitch: viewer.getPitch(), yaw: viewer.getYaw() };
  const label = destination === 'hol' ? 'Spre hol' : 'Spre cameră';
  if (panorama && triggerEvent) {
    const rect = panorama.getBoundingClientRect();
    panorama.style.setProperty('--travel-x', `${triggerEvent.clientX - rect.left}px`);
    panorama.style.setProperty('--travel-y', `${triggerEvent.clientY - rect.top}px`);
  }
  announcement.textContent = label;
  journey.classList.remove('is-error');
  journey.querySelector('.journey-error').hidden = true;
  journey.querySelector('.journey-dismiss').hidden = true;
  document.querySelectorAll('.duck-door').forEach(button => button.disabled = true);
  panorama?.classList.add('is-duck-travelling');
  journey.setAttribute('aria-hidden', 'false');
  journey.classList.add('is-active');
  await delay(reduced ? 80 : 520);
  let cleanup;
  try {
    const loaded = new Promise((resolve, reject) => {
      const done = () => { if (viewer.getScene() === destination) { cleanup(); resolve(); } };
      const fail = () => { cleanup(); reject(new Error('Scene failed to load')); };
      const timeout = setTimeout(fail, 15000);
      cleanup = () => { clearTimeout(timeout); viewer.off('load', done); viewer.off('error', fail); };
      viewer.on('load', done);
      viewer.on('error', fail);
      viewer.loadScene(destination, 0, 180, 110);
    });
    await Promise.all([loaded, delay(reduced ? 0 : 220)]);
    // Allow the destination to paint before revealing it.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    journey.classList.remove('is-active');
    journey.setAttribute('aria-hidden', 'true');
    announcement.textContent = destination === 'hol' ? 'Ai ajuns în hol.' : 'Ai ajuns în cameră.';
    await delay(reduced ? 80 : 160);
  } catch (error) {
    cleanup?.();
    journey.classList.add('is-error');
    journey.querySelector('.journey-error').hidden = false;
    const dismiss = journey.querySelector('.journey-dismiss');
    dismiss.hidden = false;
    dismiss.focus();
    await new Promise(resolve => dismiss.onclick = resolve);
    viewer.loadScene(source, sourceView.pitch, sourceView.yaw, 110);
    journey.classList.remove('is-active');
    journey.classList.remove('is-error');
    journey.setAttribute('aria-hidden', 'true');
  } finally {
    panorama?.classList.remove('is-duck-travelling');
    travelling = false;
    document.querySelectorAll('.duck-door').forEach(button => button.disabled = false);
  }
};
