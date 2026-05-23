/**
 * Gerador de Folhas de Resposta
 * Gera folhas A4 profissionais para OMR
 */
class SheetGenerator {
  static A4_W = 210;
  static A4_H = 297;
  static COLORS = { primary: [255, 109, 0], dark: [40, 40, 40], gray: [100, 100, 100], light: [120, 120, 120], white: [255, 255, 255], green: [46, 125, 50], border: [80, 80, 80] };
  static M = 12; // margem

  static generate(questions = 60, alternatives = 5, answers = {}, title = 'Simulado Trimestral') {
    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    const { A4_W, A4_H, M, COLORS } = this;
    const perCol = Math.ceil(questions / 3);
    const letters = 'ABCDE'.substring(0, alternatives);
    const today = new Date().toLocaleDateString('pt-BR');
    const lineH = 4.2;

    // === CABEÇALHO ===
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, A4_W, 28, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FOLHA DE RESPOSTAS', A4_W / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(title, A4_W / 2, 20, { align: 'center' });

    // === DADOS DO ALUNO ===
    let y = 36;
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    // Nome
    doc.text('NOME:', M, y);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(M + 15, y + 1.5, A4_W - M, y + 1.5);

    // Série e Data
    y += 9;
    doc.text('SÉRIE:', M, y);
    doc.line(M + 15, y + 1.5, 80, y + 1.5);

    doc.text('DATA:', 95, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.dark);
    doc.text(today, 112, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.line(112, y + 1.5, A4_W - M, y + 1.5);

    // === INSTRUÇÕES ===
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('INSTRUÇÕES:', M, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.light);
    const instr = [
      'Assinale apenas UMA alternativa para cada questão.',
      'Utilize caneta azul ou preta. Preencha completamente a bolha.',
      'Não rasure, não amasse e não faça marcas fora das bolhas.',
      'Questões com mais de uma marcação ou em branco serão zeradas.'
    ];
    instr.forEach((t, i) => {
      doc.text((i + 1) + '. ' + t, M + 4, y + 4 + i * 4);
    });

    // === LINHA SEPARADORA ===
    y += 4 + instr.length * 4 + 2;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(M, y, A4_W - M, y);

    // === CABEÇALHO DAS COLUNAS ===
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    const colW = (A4_W - M * 2) / 3;
    for (let c = 0; c < 3; c++) {
      const cx = M + c * colW + colW/2;
      doc.text(`QUESTÕES ${c*perCol+1}-${Math.min((c+1)*perCol, questions)}`, cx, y, { align: 'center' });
    }

    // === GRID DE BOLHAS ===
    y += 4;
    const gridStartY = y;
    const bubbleR = 3.2;
    const altSpan = colW / (alternatives + 1);

    for (let c = 0; c < 3; c++) {
      const x0 = M + c * colW + 8;

      for (let q = 0; q < perCol; q++) {
        const num = c * perCol + q + 1;
        if (num > questions) break;

        const qy = gridStartY + q * 7.8;

        // Fundo alternado para legibilidade
        if (q % 2 === 0) {
          doc.setFillColor(247, 247, 247);
          doc.rect(M + c * colW + 1, qy - 1.5, colW - 2, 7.1, 'F');
        }

        // Número da questão
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(num.toString(), x0 - 5, qy + 3, { align: 'right' });

        // Bolhas
        for (let a = 0; a < alternatives; a++) {
          const cx = x0 + a * altSpan + altSpan/2;
          const cy = qy + 0.5;

          if (answers[num] === letters[a]) {
            // Preenchida (gabarito)
            doc.setFillColor(...COLORS.green);
            doc.setDrawColor(...COLORS.green);
            doc.circle(cx, cy, bubbleR, 'FD');
            doc.setTextColor(...COLORS.white);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(letters[a], cx, cy + 0.8, { align: 'center' });
          } else {
            // Vazia
            doc.setDrawColor(80, 80, 80);
            doc.setLineWidth(0.5);
            doc.circle(cx, cy, bubbleR, 'S');
            doc.setTextColor(...COLORS.light);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.text(letters[a], cx, cy + 0.5, { align: 'center' });
          }
        }
      }
    }

    // === RODAPÉ ===
    const footerY = A4_H - 10;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.3);
    doc.line(M, footerY - 4, A4_W - M, footerY - 4);

    doc.setTextColor(160, 160, 160);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('LeGab - Sistema de Correção Automática de Gabaritos', A4_W / 2, footerY, { align: 'center' });

    return doc;
  }

  static generateBlank(questions, alternatives, title) {
    const doc = this.generate(questions, alternatives, {}, title || 'Simulado Trimestral');
    doc.save('folha-respostas.pdf');
  }

  static generateFilled(questions, alternatives, answers, title) {
    const doc = this.generate(questions, alternatives, answers, title || 'Simulado Trimestral - Gabarito');
    doc.save('gabarito-preenchido.pdf');
  }
}

window.SheetGenerator = SheetGenerator;