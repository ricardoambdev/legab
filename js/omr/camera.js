/**
 * Módulo de Câmera
 * Gerencia captura de vídeo e imagens com OpenCV.js
 */
class Camera {
  constructor() {
    this.video = null;
    this.stream = null;
    this.active = false;
  }

  async start(videoElement) {
    this.video = videoElement;
    const constraints = {
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.video.srcObject = this.stream;
    await new Promise((res, rej) => {
      this.video.onloadedmetadata = () => this.video.play().then(res).catch(rej);
      this.video.onerror = () => rej(new Error('Erro no vídeo'));
      setTimeout(() => rej(new Error('Timeout')), 8000);
    });
    this.active = true;
    return { width: this.video.videoWidth, height: this.video.videoHeight };
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
    this.video = null;
    this.active = false;
  }

  capture() {
    if (!this.active || !this.video) throw new Error('Câmera não ativa');
    const c = document.createElement('canvas');
    c.width = this.video.videoWidth;
    c.height = this.video.videoHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(this.video, 0, 0);
    return { canvas: c, dataURL: c.toDataURL('image/jpeg', 0.92), width: c.width, height: c.height };
  }

  captureToMat() {
    const { canvas } = this.capture();
    return cv.imread(canvas);
  }
}

window.Camera = Camera;