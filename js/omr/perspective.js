/**
 * Módulo de Transformação de Perspectiva
 * Detecta e corrige a perspectiva do documento
 */
class PerspectiveModule {
    /**
     * Encontra o maior contorno retangular (o documento)
     */
    static findDocumentContour(src, config = {}) {
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        
        // Threshold para binarizar
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0);
        
        const thresh = new cv.Mat();
        cv.adaptiveThreshold(
            blurred, 
            thresh, 
            255, 
            cv.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv.THRESH_BINARY_INV, 
            11, 
            2
        );

        // Encontra contornos
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let largestContour = null;
        let largestArea = 0;
        const minArea = config.minArea || 10000;
        const maxArea = config.maxArea || src.rows * src.cols * 0.9;

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            
            if (area < minArea || area > maxArea) continue;
            
            // Aproxima polígono
            const epsilon = 0.02 * cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, epsilon, true);
            
            // Verifica se tem 4 pontos (retângulo)
            if (approx.rows === 4) {
                if (area > largestArea) {
                    largestArea = area;
                    if (largestContour) largestContour.delete();
                    largestContour = contour.clone();
                }
            }
            
            approx.delete();
        }

        // Limpeza
        contours.delete();
        hierarchy.delete();
        gray.delete();
        blurred.delete();
        thresh.delete();

        return { contour: largestContour, area: largestArea };
    }

    /**
     * Ordena pontos no sentido horário: top-left, top-right, bottom-right, bottom-left
     */
    static orderPoints(points) {
        // points é um array de 4 objetos {x, y}
        const sorted = points.sort((a, b) => a.y - b.y); // Ordena por Y
        
        // Pega os dois de cima
        const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
        // Pega os dois de baixo
        const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
        
        // Ordena: TL, TR, BR, BL
        return [
            top[0],     // Top-left
            top[1],     // Top-right
            bottom[1],  // Bottom-right
            bottom[0]   // Bottom-left
        ];
    }

    /**
     * Aplica transformação de perspectiva (warp)
     */
    static warpPerspective(src, contour, width, height) {
        if (!contour || contour.length < 4) {
            return null;
        }

        // Ordena pontos
        const points = this.orderPoints(contour);
        
        // Ponto de origem
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, 
            points.map(p => [p.x, p.y]).flat()
        );

        // Ponto de destino (retângulo)
        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            width - 1, 0,
            width - 1, height - 1,
            0, height - 1
        ]);

        // Calcula matriz de transformação
        const matrix = cv.getPerspectiveTransform(srcPoints, dstPoints);
        
        // Aplica warp
        const dst = new cv.Mat();
        const dsize = new cv.Size(width, height);
        cv.warpPerspective(src, dst, matrix, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, 0);

        // Limpeza
        srcPoints.delete();
        dstPoints.delete();
        matrix.delete();

        return dst;
    }

    /**
     * Detecta e corrige perspectiva automaticamente
     */
    static autoCorrect(src, config = {}) {
        const width = config.width || 600;
        const height = config.height || 800;
        
        // Encontra contorno do documento
        const { contour } = this.findDocumentContour(src, config);
        
        if (!contour) {
            return { corrected: null, contour: null, success: false };
        }

        // Converte contour para array de pontos
        const points = [];
        for (let i = 0; i < contour.rows; i++) {
            points.push({
                x: contour.dataFloat32[i * 2],
                y: contour.dataFloat32[i * 2 + 1]
            });
        }

        // Aplica warp
        const corrected = this.warpPerspective(src, points, width, height);
        
        return { corrected, contour: points, success: true };
    }

    /**
     * Desenha contorno na imagem
     */
    static drawContour(src, contour, color = [0, 255, 0], thickness = 3) {
        const dst = src.clone();
        if (!contour) return dst;
        
        const points = [];
        for (let i = 0; i < contour.length; i++) {
            points.push([contour[i].x, contour[i].y]);
        }
        
        const pts = cv.matFromArray(contour.length, 1, cv.CV_32SC2, points.flat());
        cv.polylines(dst, pts, true, color, thickness);
        pts.delete();
        
        return dst;
    }
}

window.PerspectiveModule = PerspectiveModule;
