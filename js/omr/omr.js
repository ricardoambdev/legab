/**
 * Módulo OMR - Optical Mark Recognition
 * Detecta e lê marcações em gabaritos
 */
class OMR {
  constructor(config = {}) {
    this.questions = config.questions || 60;
    this.alternatives = config.alternatives || 5;
    this.columns = config.columns || 3;
    this.threshold = config.threshold || 0.4;
    this.grid = null;
    this.letters = 'ABCDE';
  }

  /**
   * Gera grid de bolhas baseado nas dimensões da imagem
   */
  buildGrid(imgW, imgH) {
    const { questions, alternatives, columns } = this;
    const perCol = Math.ceil(questions / columns);
    const colW = imgW / columns;

    this.grid = [];

    for (let col = 0; col < columns; col++) {
      for (let q = 0; q < perCol; q++) {
        const num = col * perCol + q + 1;
        if (num > questions) break;

        const bubbles = [];
        const blockH = imgH / perCol;

        for (let a = 0; a < alternatives; a++) {
          const cx = col * colW + colW * 0.1 + a * (colW * 0.8 / alternatives) + (colW * 0.8 / alternatives) / 2;
          const cy = q * blockH + blockH * 0.5;
          const r = Math.min(colW * 0.8 / (alternatives * 2.5), blockH * 0.3);

          bubbles.push({
            question: num,
            letter: this.letters[a] || String.fromCharCode(65 + a),
            cx: Math.floor(cx),
            cy: Math.floor(cy),
            r: Math.floor(r)
          });
        }

        this.grid.push({ question: num, bubbles });
      }
    }
  }

  /**
   * Detecta preenchimento de uma bolha (região circular)
   */
  detectBubble(src, bubble) {
    const { cx, cy, r } = bubble;
    if (cx - r < 0 || cy - r < 0 || cx + r >= src.cols || cy + r >= src.rows) {
      return { filled: false, confidence: 0 };
    }

    const roi = src.roi(new cv.Rect(cx - r, cy - r, r * 2, r * 2));
    if (roi.empty()) { roi.delete(); return { filled: false, confidence: 0 }; }

    // Média de pixels brancos (255 = vazio, 0 = preenchido)
    const mean = cv.mean(roi)[0];
    const fill = 1 - (mean / 255);
    roi.delete();

    return {
      filled: fill >= this.threshold,
      confidence: Math.min(1, fill)
    };
  }

  /**
   * Processa imagem e retorna respostas detectadas
   */
  process(src) {
    if (!src || src.empty()) return [];

    if (!this.grid) this.buildGrid(src.cols, src.rows);

    const results = [];

    for (const item of this.grid) {
      let bestLetter = null;
      let bestConfidence = 0;
      const alternatives = [];

      for (const b of item.bubbles) {
        const d = this.detectBubble(src, b);
        alternatives.push({ letter: b.letter, ...d });

        if (d.confidence > bestConfidence) {
          bestConfidence = d.confidence;
          bestLetter = b.letter;
        }
      }

      results.push({
        question: item.question,
        answer: bestLetter || '',
        confidence: bestConfidence,
        alternatives
      });
    }

    return results;
  }

  /**
   * Compara com gabarito correto
   */
  compare(results, correctAnswers) {
    const correctArr = typeof correctAnswers === 'string' ? correctAnswers.toUpperCase().split('') : correctAnswers;
    let correct = 0, wrong = 0, blank = 0;
    const details = [];

    for (let i = 0; i < results.length; i++) {
      const user = (results[i].answer || '').toUpperCase();
      const key = (correctArr[i] || '').toUpperCase();
      let status;

      if (!user) { status = 'blank'; blank++; }
      else if (user === key) { status = 'correct'; correct++; }
      else { status = 'wrong'; wrong++; }

      details.push({
        question: results[i].question,
        answer: user,
        correct: key,
        status,
        confidence: results[i].confidence
      });
    }

    const total = details.length;
    return {
      total,
      correct,
      wrong,
      blank,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      details
    };
  }
}

window.OMR = OMR;