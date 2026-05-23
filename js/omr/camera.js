/**
 * Módulo de Camera
 * Gerencia captura de vídeo e imagens
 */
class CameraModule {
    constructor(options = {}) {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.isStreaming = false;
        this.onFrame = options.onFrame || null;
        this.fps = options.fps || 30;
        
        this.frameCount = 0;
        this.lastFrameTime = 0;
    }

    /**
     * Inicia a câmera
     */
    async start(videoElement, constraints = {}) {
        this.video = videoElement;
        
        const defaultConstraints = {
            video: {
                facingMode: 'environment', // Câmera traseira
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        const finalConstraints = { ...defaultConstraints, ...constraints };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
            this.video.srcObject = this.stream;
            
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(resolve).catch(reject);
                };
                this.video.onerror = reject;
                setTimeout(() => reject(new Error('Timeout carregar vídeo')), 5000);
            });

            this.isStreaming = true;
            console.log('📷 Câmera iniciada:', this.video.videoWidth, 'x', this.video.videoHeight);
            return true;
        } catch (error) {
            console.error('❌ Erro na câmera:', error.name, error.message);
            throw error;
        }
    }

    /**
     * Para a câmera
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }
        this.isStreaming = false;
        console.log('📷 Câmera parada');
    }

    /**
     * Captura um frame da câmera
     */
    capture() {
        if (!this.isStreaming || !this.video) {
            throw new Error('Câmera não está ativa');
        }

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
        
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx = this.canvas.getContext('2d');
        
        this.ctx.drawImage(this.video, 0, 0);
        
        return this.canvas;
    }

    /**
     * Captura imagem e retorna como OpenCV Mat
     */
    captureToMat() {
        const canvas = this.capture();
        const mat = cv.imread(canvas);
        return mat;
    }

    /**
     * Inicia processamento contínuo de frames
     */
    startProcessing(processFrameCallback, fps = 10) {
        this.stopProcessing();
        
        const process = () => {
            if (!this.isStreaming) return;
            
            const now = Date.now();
            if (now - this.lastFrameTime >= 1000 / fps) {
                try {
                    const mat = this.captureToMat();
                    processFrameCallback(mat, this.canvas);
                    mat.delete();
                } catch (error) {
                    console.error('Erro processando frame:', error);
                }
                this.lastFrameTime = now;
            }
            
            this.processingId = requestAnimationFrame(process);
        };
        
        this.processingId = requestAnimationFrame(process);
    }

    /**
     * Para processamento contínuo
     */
    stopProcessing() {
        if (this.processingId) {
            cancelAnimationFrame(this.processingId);
            this.processingId = null;
        }
    }

    /**
     * Tira foto e retorna dados da imagem
     */
    takePhoto() {
        const canvas = this.capture();
        return {
            dataURL: canvas.toDataURL('image/jpeg', 0.9),
            width: canvas.width,
            height: canvas.height
        };
    }
}

window.CameraModule = CameraModule;
