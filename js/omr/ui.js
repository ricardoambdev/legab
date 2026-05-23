/**
 * Módulo de Interface - Modals e feedback visual
 */
class UI {
  static showLoading(text = 'Processando...') {
    let el = document.getElementById('loading-screen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loading-screen';
      el.className = 'loading-screen';
      el.innerHTML = '<div class="spinner"></div><div class="loading-text"></div>';
      document.body.appendChild(el);
    }
    el.querySelector('.loading-text').textContent = text;
    el.classList.remove('hidden');
  }

  static hideLoading() {
    const el = document.getElementById('loading-screen');
    if (el) el.classList.add('hidden');
  }

  static status(msg, type = 'info') {
    const el = document.getElementById('status');
    if (el) {
      el.textContent = msg;
      el.className = `status-bar ${type}`;
      el.classList.remove('hidden');
    }
  }

  static showResults(results, correctAnswers) {
    const existing = document.getElementById('results-modal');
    if (existing) existing.remove();

    const comp = results.total ? results : new OMR().compare(results, correctAnswers);
    const { correct, wrong, blank, percentage, details } = comp;

    const rows = details.map(d => `
      <tr class="${d.status}">
        <td style="font-weight:600">${d.question}</td>
        <td>${d.answer || '<span style="color:#999">-</span>'}</td>
        <td>${d.correct}</td>
        <td>${d.status === 'correct' ? '✓' : d.status === 'wrong' ? '✗' : '○'}</td>
      </tr>
    `).join('');

    const modal = document.createElement('div');
    modal.id = 'results-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>
            <span class="material-icons">assessment</span>
            Resultado
          </h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <span class="material-icons">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="result-grid">
            <div class="result-stat correct">
              <span class="value">${correct}</span>
              <span class="label">Acertos</span>
            </div>
            <div class="result-stat wrong">
              <span class="value">${wrong}</span>
              <span class="label">Erros</span>
            </div>
            <div class="result-stat blank">
              <span class="value">${blank}</span>
              <span class="label">Branco</span>
            </div>
            <div class="result-stat score">
              <span class="value">${percentage}%</span>
              <span class="label">Aproveitamento</span>
            </div>
          </div>
          <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="padding:8px;text-align:left">#</th>
                  <th style="padding:8px;text-align:left">Resposta</th>
                  <th style="padding:8px;text-align:left">Gabarito</th>
                  <th style="padding:8px;text-align:left">Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
              <span class="material-icons">check</span>Fechar
            </button>
            <button class="btn btn-outline" onclick="location.reload()">
              <span class="material-icons">refresh</span>Novo Scan
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }
}

window.UI = UI;