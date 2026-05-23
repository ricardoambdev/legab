/**
 * Módulo de Interface do Usuário
 * Gerencia UI, overlays e feedback visual
 */
class UIModule {
    constructor(options = {}) {
        this.videoElement = options.videoElement || null;
        this.canvasElement = options.canvasElement || null;
        this.overlayElement = options.overlayElement || null;
        this.statusElement = options.statusElement || null;
        this.onCapture = options.onCapture || null;
        
        this.isDetecting = false;
        this.detectionFeedback = null;
    }

    /**
     * Atualiza status na UI
     */
    setStatus(message, type = 'info') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.className = `status status-${type}`;
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Mostra overlay de detecção
     */
    showOverlay(content) {
        if (this.overlayElement) {
            this.overlayElement.innerHTML = content;
            this.overlayElement.style.display = 'block';
        }
    }

    /**
     * Esconde overlay
     */
    hideOverlay() {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'none';
        }
    }

    /**
     * Desenha retângulo de detecção
     */
    drawDetectionBox(canvas, contour, color = '#00FF00') {
        if (!canvas || !contour) return;
        
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        ctx.moveTo(contour[0].x, contour[0].y);
        for (let i = 1; i < contour.length; i++) {
            ctx.lineTo(contour[i].x, contour[i].y);
        }
        
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * Desenha grid de bolhas
     */
    drawBubbleGrid(canvas, grid, color = '#FF0000') {
        if (!canvas || !grid) return;
        
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        for (const questionBubbles of grid) {
            for (const bubble of questionBubbles) {
                ctx.strokeRect(bubble.x, bubble.y, bubble.w, bubble.h);
            }
        }
    }

    /**
     * Mostra resultado do OMR
     */
    showResults(results, correctAnswers = null) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Resultado do Gabarito</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-body">
                    ${this.generateResultsHTML(results, correctAnswers)}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Gera HTML dos resultados
     */
    generateResultsHTML(results, correctAnswers = null) {
        const summary = this.generateSummary(results, correctAnswers);
        
        let html = `
            <div class="result-summary">
                <div class="stat correct">
                    <span class="stat-value">${summary.correct}</span>
                    <span class="stat-label">Acertos</span>
                </div>
                <div class="stat wrong">
                    <span class="stat-value">${summary.wrong}</span>
                    <span class="stat-label">Erros</span>
                </div>
                <div class="stat blank">
                    <span class="stat-value">${summary.blank}</span>
                    <span class="stat-label">Branco</span>
                </div>
                <div class="stat percentage">
                    <span class="stat-value">${summary.percentage}%</span>
                    <span class="stat-label">Aproveitamento</span>
                </div>
            </div>
            
            <div class="result-details">
                <h3>Detalhamento</h3>
                <table class="result-table">
                    <thead>
                        <tr>
                            <th>Questão</th>
                            <th>Sua Resposta</th>
                            <th>Gabarito</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (const detail of summary.details) {
            const statusClass = detail.status === 'correct' ? 'correct' : 
                               (detail.status === 'wrong' ? 'wrong' : 'blank');
            const statusText = detail.status === 'correct' ? '✓' : 
                              (detail.status === 'wrong' ? '✗' : '○');
            
            html += `
                <tr class="${statusClass}">
                    <td>${detail.question}</td>
                    <td>${detail.userAnswer || '-'}</td>
                    <td>${detail.correctAnswer}</td>
                    <td>${statusText}</td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div class="result-actions">
                <button class="md-btn md-btn-primary" onclick="this.closest('.modal-overlay').remove()">
                    <span class="material-icons">check</span>
                    Fechar
                </button>
                <button class="md-btn md-btn-outline" onclick="window.location.reload()">
                    <span class="material-icons">refresh</span>
                    Novo Scan
                </button>
            </div>
        `;
        
        return html;
    }

    /**
     * Gera resumo dos resultados
     */
    generateSummary(results, correctAnswers = null) {
        const summary = {
            total: results.length,
            correct: 0,
            wrong: 0,
            blank: 0,
            percentage: 0,
            details: []
        };
        
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const correct = correctAnswers ? correctAnswers[i] : null;
            
            const detail = {
                question: result.question,
                userAnswer: result.selected,
                correctAnswer: correct,
                confidence: result.confidence
            };
            
            if (!result.selected) {
                summary.blank++;
                detail.status = 'blank';
            } else if (correct && result.selected === correct) {
                summary.correct++;
                detail.status = 'correct';
            } else {
                summary.wrong++;
                detail.status = 'wrong';
            }
            
            summary.details.push(detail);
        }
        
        summary.percentage = Math.round((summary.correct / summary.total) * 100);
        
        return summary;
    }

    /**
     * Animação de scanner
     */
    animateScan() {
        const scanLine = document.querySelector('.scan-line');
        if (scanLine) {
            scanLine.classList.add('scanning');
        }
    }

    /**
     * Para animação de scanner
     */
    stopScan() {
        const scanLine = document.querySelector('.scan-line');
        if (scanLine) {
            scanLine.classList.remove('scanning');
        }
    }
}

window.UIModule = UIModule;
