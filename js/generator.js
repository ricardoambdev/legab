/**
 * Gerador de Folhas de Resposta
 * Gera folhas A4 em PDF para impressão
 */
class SheetGenerator {
  static A4_W = 210; // mm
  static A4_H = 297;

  static generate(questions = 60, alternatives = 5, answers = {}) {
    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    const { A4_W, A4_H } = this;
    const M = 15; // margin
    const letters = 'ABCDE'.substring(0, alternatives);

    // Cabeçalho
    doc.setFillColor(255, 109, 0);
    doc.rect(0, 0, A4_W, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FOLHA DE RESPOSTAS', A4_W / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Simulado Trimestral', A4_W / 2, 20, { align: 'center' });

    // Informações do aluno
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NOME: _______________________________________________', M, 34);
    doc.text('SÉRIE: _______________     DATA: ____/____/________', M, 40);

    // Instruções
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    const instr = [
      'Assinale apenas uma resposta para cada questão.',
      'Utilize apenas caneta azul ou preta.',
      'Não rasure ou amasse esta folha de resposta.',
      'Questões em branco ou com mais de uma alternativa assinalada serão desconsideradas.'
    ];
    let iy = 48;
    instr.forEach(t => {
      doc.text(t, M, iy);
      iy += 3.5;
    });

    // Grid de respostas
    const cols = 3;
    const perCol = Math.ceil(questions / cols);
    const startY = 60;
    const availableW = A4_W - M * 2;
    const colW = availableW / cols;
    const bubbleR = 3;
    const altGap = colW / (alternatives + 1);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    for (let c = 0; c < cols; c++) {
      const x0 = M + c * colW + 8;

      for (let q = 0; q < perCol; q++) {
        const num = c * perCol + q + 1;
        if (num > questions) break;

        const y0 = startY + q * 7.8;

        // Número da questão
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(String(num).padStart(2, '0') + '.', x0 - 6, y0 + 3.5, { align: 'right' });

        // Bolhas das alternativas
        for (let a = 0; a < alternatives; a++) {
          const letter = letters[a];
          const cx = x0 + a * altGap + altGap / 2;
          const cy = y0;

          // Círculo
          doc.setDrawColor(80, 80, 80);
          doc.setLineWidth(0.4);

          // Preenchimento se for resposta correta
          if (answers[num] === letter) {
            doc.setFillColor(76, 175, 80);
            doc.circle(cx, cy + 1.5, bubbleR, 'FD');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6);
            doc.text(letter, cx, cy + 3, { align: 'center' });
            doc.setFontSize(7);
          } else {
            doc.setFillColor(255, 255, 255);
            doc.circle(cx, cy + 1.5, bubbleR, 'FD');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(6);
            doc.text(letter, cx, cy + 3, { align: 'center' });
            doc.setFontSize(7);
          }
        }
      }
    }

    // Rodapé
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(7);
    doc.text('LeGab - Sistema de Correção Automática - www.legab.com.br', A4_W / 2, A4_H - 10, { align: 'center' });

    return doc;
  }

  static generateBlank(questions, alternatives) {
    const doc = this.generate(questions, alternatives, {});
    doc.save('folha-respostas-vazia.pdf');
  }

  static generateFilled(questions, alternatives, answers) {
    const doc = this.generate(questions, alternatives, answers);
    doc.save('gabarito-preenchido.pdf');
  }
}

window.SheetGenerator = SheetGenerator;