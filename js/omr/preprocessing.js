/**
 * Módulo de Pré-processamento de Imagem
 * Aplica filtros e melhorias para OMR
 */
class PreprocessingModule {
    /**
     * Converte para escala de cinza
     */
    static toGrayscale(src, dst = null) {
        if (!dst) dst = new cv.Mat();
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
        return dst;
    }

    /**
     * Aplica Gaussian Blur
     */
    static blur(src, dst = null, ksize = 5) {
        if (!dst) dst = new cv.Mat();
        const ksizeVal = new cv.Size(ksize, ksize);
        cv.GaussianBlur(src, dst, ksizeVal, 0, 0, cv.BORDER_DEFAULT);
        return dst;
    }

    /**
     * Threshold adaptativo
     */
    static adaptiveThreshold(src, dst = null, blockSize = 11, C = 2) {
        if (!dst) dst = new cv.Mat();
        cv.adaptiveThreshold(
            src, 
            dst, 
            255, 
            cv.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv.THRESH_BINARY_INV, 
            blockSize, 
            C
        );
        return dst;
    }

    /**
     * Threshold simples
     */
    static threshold(src, dst = null, thresh = 127, maxval = 255, type = cv.THRESH_BINARY) {
        if (!dst) dst = new cv.Mat();
        cv.threshold(src, dst, thresh, maxval, type);
        return dst;
    }

    /**
     * Detecção de bordas Canny
     */
    static canny(src, dst = null, threshold1 = 50, threshold2 = 150) {
        if (!dst) dst = new cv.Mat();
        cv.Canny(src, dst, threshold1, threshold2);
        return dst;
    }

    /**
     * Operações morfológicas
     */
    static morphology(src, dst = null, operation = cv.MORPH_CLOSE, kernelSize = 3) {
        if (!dst) dst = new cv.Mat();
        const kernel = cv.Mat.ones(kernelSize, kernelSize, cv.CV_8U);
        const anchor = new cv.Point(-1, -1);
        
        if (operation === cv.MORPH_CLOSE) {
            cv.morphologyEx(src, dst, cv.MORPH_CLOSE, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        } else if (operation === cv.MORPH_OPEN) {
            cv.morphologyEx(src, dst, cv.MORPH_OPEN, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
        }
        
        kernel.delete();
        return dst;
    }

    /**
     * Equalização de histograma
     */
    static equalizeHistogram(src, dst = null) {
        if (!dst) dst = new cv.Mat();
        cv.equalizeHist(src, dst);
        return dst;
    }

    /**
     * Normalização
     */
    static normalize(src, dst = null) {
        if (!dst) dst = new cv.Mat();
        cv.normalize(src, dst, 0, 255, cv.NORM_MINMAX);
        return dst;
    }

    /**
     * Pipeline completo de pré-processamento para OMR
     */
    static processForOMR(src, config = {}) {
        const result = {
            gray: null,
            blurred: null,
            threshold: null,
            edges: null
        };

        // 1. Grayscale
        result.gray = this.toGrayscale(src);

        // 2. Blur
        result.blurred = this.blur(result.gray, null, config.blurSize || 5);

        // 3. Threshold adaptativo
        result.threshold = this.adaptiveThreshold(
            result.blurred, 
            null, 
            config.blockSize || 11, 
            config.constant || 2
        );

        // 4. Bordas (opcional)
        result.edges = this.canny(result.gray);

        return result;
    }

    /**
     * Remove ruídos da imagem
     */
    static denoise(src, dst = null, h = 10) {
        if (!dst) dst = new cv.Mat();
        // Fast NLM denoising
        cv.fastNlMeansDenoising(src, dst, h, 7, 21);
        return dst;
    }
}

window.PreprocessingModule = PreprocessingModule;
