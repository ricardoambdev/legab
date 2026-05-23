/**
 * Módulo de Interface do Usuário
 * Gerencia UI, modals e feedback visual
 */
class UIModule {
    constructor(options = {}) {
        this.videoElement = options.videoElement || null;
        this.statusElement = options.statusElement || null;
        this.logElement = options.logElement || null;
    }

    /**
     * Atualiza status na UI
     */
    setStatus(message, type = 'info') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.className = `status-text status-${type}`;
        }
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Atualiza log
     */
    setLog(message) {
        if (this.logElement) {
            this.logElement.textContent = message;
        }
    }

    /**
     * Mostra resultado do OMR
     */
    showResults(results, correctAnswers = null) {
        const summary = this.generateSummary(results, correctAnswers);
        
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
                    ${this.generateSummaryHTML(summary)}
                    ${this.generateActionsHTML()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Gera HTML do resumo
     */
    generateSummaryHTML(summary) {
        return `
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
                            <th>#</th>
                            <th>Sua Resposta</th>
                            <th>Gabarito</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateTableRows(summary.details)}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Gera linhas da tabela
     */
    generateTableRows(details) {
        return details.map(detail => {
            const statusClass = detail.status;
            const statusIcon = detail.status === 'correct' ? 'check_circle' : 
                              (detail.status === 'wrong' ? 'cancel' : 'help');
            
            return `
                <tr class="${statusClass}">
                    <td><strong>${detail.question}</strong></td>
                    <td>${detail.userAnswer || '<span style="color:#999">-</span>'}</td>
                    <td>${detail.correctAnswer}</td>
                    <td><span class="material-icons" style="font-size:18px">${statusIcon}</span></td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Gera HTML das ações
     */
    generateActionsHTML() {
        return `
            <div class="result-actions" style="display:flex;gap:12px;margin-top:24px;">
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
        
        const correctStr = correctAnswers ? correctAnswers.toUpperCase() : '';
        
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const correct = correctStr[i] || '';
            
            const detail = {
                question: result.question,
                userAnswer: (result.selected || '').toUpperCase(),
                correctAnswer: correct,
                confidence: result.confidence
            };
            
            if (!result.selected) {
                summary.blank++;
                detail.status = 'blank';
            } else if (correct && detail.userAnswer === correct) {
                summary.correct++;
                detail.status = 'correct';
            } else {
                summary.wrong++;
                detail.status = 'wrong';
            }
            
            summary.details.push(detail);
        }
        
        summary.percentage = summary.total > 0 ? 
            Math.round((summary.correct / summary.total) * 100) : 0;
        
        return summary;
    }
}

window.UIModule = UIModule;
