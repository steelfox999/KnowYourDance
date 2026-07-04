import { screen, el, primaryButton, ghostButton, enter } from '../core/ui.js';

/**
 * Camera step: one photo. Uses getUserMedia when available; if the camera is
 * missing or blocked (e.g. testing in a browser), it degrades to a file picker
 * so the flow never dead-ends.
 */
export default {
  render(stage, session, engine) {
    const video = el('video', { class: 'cam-video', autoplay: '', playsinline: '', muted: '' });
    const canvas = el('canvas', { class: 'cam-canvas' });
    const status = el('p', { class: 'cam-status', text: 'Get ready…' });
    const countdown = el('div', { class: 'cam-countdown' });

    const shootBtn = primaryButton('Capture', startCountdown);
    const fileFallback = el('input', { type: 'file', accept: 'image/*', class: 'cam-file' });
    fileFallback.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => capture(reader.result);
      reader.readAsDataURL(f);
    });

    const controls = el('div', { class: 'cam-controls' }, [shootBtn]);
    const view = screen('screen-camera', [
      el('div', { class: 'cam-frame' }, [video, canvas, countdown, status, controls]),
    ]);
    stage.appendChild(enter(view));

    let stream = null;

    (async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
          audio: false,
        });
        video.srcObject = stream;
        status.textContent = 'Strike your pose, then press Capture.';
      } catch (err) {
        status.textContent = 'No camera available — upload a photo instead.';
        video.style.display = 'none';
        controls.innerHTML = '';
        controls.appendChild(el('label', { class: 'btn btn-primary' }, ['Choose photo', fileFallback]));
      }
    })();

    function startCountdown() {
      shootBtn.disabled = true;
      let n = 3;
      countdown.textContent = n;
      countdown.classList.add('show');
      const t = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(t);
          countdown.classList.remove('show');
          snap();
        } else {
          countdown.textContent = n;
        }
      }, 800);
    }

    function snap() {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 960;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Mirror to match the on-screen preview.
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      capture(canvas.toDataURL('image/jpeg', 0.92));
    }

    function capture(dataUrl) {
      session.photo = dataUrl;
      stopStream();
      // Confirm step so the visitor can retake before transforming.
      controls.innerHTML = '';
      video.style.display = 'none';
      const preview = el('img', { class: 'cam-preview', src: dataUrl });
      view.querySelector('.cam-frame').insertBefore(preview, status);
      status.textContent = 'Looking good?';
      controls.appendChild(ghostButton('Retake', () => engine.goTo('camera')));
      controls.appendChild(primaryButton('Use this photo', () => engine.next()));
    }

    function stopStream() {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    return stopStream;
  },
};
