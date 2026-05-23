/**
 * Módulo de Pré-processamento de Imagem
 * Filtros e melhorias para OMR usando OpenCV.js
 */
class Preprocessing {
  static process(src) {
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const thresh = new cv.Mat();
    const open = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    const kernel = cv.Mat.ones(2, 2, cv.CV_8U);
    cv.morphologyEx(thresh, open, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 1);

    gray.delete(); blurred.delete(); kernel.delete();

    return { thresh, open };
  }

  static cleanup(mats) {
    if (Array.isArray(mats)) mats.forEach(m => { if (m && typeof m.delete === 'function') try { m.delete() } catch(e) {} });
    else if (mats && typeof mats.delete === 'function') try { mats.delete() } catch(e) {}
  }
}

window.Preprocessing = Preprocessing;