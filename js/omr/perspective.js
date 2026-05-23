/**
 * Módulo de Transformação de Perspectiva
 * Detecta documento e corrige inclinação
 */
class Perspective {
  static findDocument(src, minArea = 8000) {
    const gray = new cv.Mat();
    const blur = new cv.Mat();
    const edges = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    cv.Canny(blur, edges, 50, 150);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best = null, bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < minArea || area > src.rows * src.cols * 0.9) continue;

      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4 && area > bestArea) {
        if (best) best.delete();
        best = approx.clone();
        bestArea = area;
      }
      approx.delete();
    }

    gray.delete(); blur.delete(); edges.delete();
    contours.delete(); hierarchy.delete();

    if (!best) return null;

    const pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: best.data32S[i * 2], y: best.data32S[i * 2 + 1] });
    }
    best.delete();

    pts.sort((a, b) => a.y - b.y);
    const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
    return [top[0], top[1], bottom[1], bottom[0]];
  }

  static warp(src, corners, w = 600, h = 800) {
    const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, corners.map(p => [p.x, p.y]).flat());
    const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w - 1, 0, w - 1, h - 1, 0, h - 1]);

    const M = cv.getPerspectiveTransform(srcPts, dstPts);
    const dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_CONSTANT, 0);

    srcPts.delete(); dstPts.delete(); M.delete();
    return dst;
  }
}

window.Perspective = Perspective;