class GabaritoGenerator {
    constructor() {
        this.options = 'ABCDE';
    }

    generateQRData(answers, config) {
        return JSON.stringify({
            type: 'legab_gabarito',
            answers: answers,
            questions: config.questions,
            alternatives: config.alternatives,
            leftColumn: config.leftColumn,
            rightColumn: config.rightColumn,
            version: '3.0',
            generated: new Date().toISOString()
        });
    }

    createGabaritoHTML(config, showAnswers = false) {
        const numQuestions = config.numQuestions || 65;
        const numAlternatives = config.numAlternatives || 5;
        const leftColumn = config.leftColumn || 33;
        const rightColumn = config.rightColumn || 32;
        const schoolName = config.schoolName || '';
        const logoUrl = config.logoUrl || '';
        const answers = showAnswers ? (config.answers || '') : '';
        const opts = this.options.substring(0, numAlternatives);

        const questionsPerPage = leftColumn + rightColumn;
        const totalPages = Math.ceil(numQuestions / questionsPerPage);
        let pagesHTML = '';

        for (let page = 0; page < totalPages; page++) {
            const startQ = page * questionsPerPage + 1;
            const endQ = Math.min(startQ + questionsPerPage - 1, numQuestions);
            const rowsOnPage = leftColumn;

            let tableRows = '';
            for (let row = 0; row < rowsOnPage; row++) {
                const q1 = startQ + row;
                const q2 = startQ + row + leftColumn;

                tableRows += '<tr>';

                if (q1 >= startQ && q1 <= Math.min(startQ + leftColumn - 1, numQuestions)) {
                    tableRows += `<td class="question-num">${q1}</td>`;
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        const alt = opts[altIndex];
                        if (showAnswers && answers[q1 - 1] === alt) {
                            tableRows += `<td class="bubble-cell"><div class="bubble filled">${alt}</div></td>`;
                        } else {
                            tableRows += `<td class="bubble-cell"><div class="bubble"></div></td>`;
                        }
                    }
                } else {
                    tableRows += '<td class="question-num"></td>';
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        tableRows += '<td class="bubble-cell"></td>';
                    }
                }

                tableRows += '<td class="col-divider"></td>';

                if (q2 >= startQ + leftColumn && q2 <= numQuestions) {
                    tableRows += `<td class="question-num">${q2}</td>`;
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        const alt = opts[altIndex];
                        if (showAnswers && answers[q2 - 1] === alt) {
                            tableRows += `<td class="bubble-cell"><div class="bubble filled">${alt}</div></td>`;
                        } else {
                            tableRows += `<td class="bubble-cell"><div class="bubble"></div></td>`;
                        }
                    }
                } else {
                    tableRows += '<td class="question-num"></td>';
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        tableRows += '<td class="bubble-cell"></td>';
                    }
                }

                tableRows += '</tr>';
            }

            const headerCols = `<th class="question-num">Q</th>` +
                opts.split('').map(alt => `<th class="alt-header">${alt}</th>`).join('') +
                '<th class="col-divider"></th>' +
                `<th class="question-num">Q</th>` +
                opts.split('').map(alt => `<th class="alt-header">${alt}</th>`).join('');

            pagesHTML += `
                <div class="gabarito-page">
                    <div class="gabarito-header">
                        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="gabarito-logo">` : ''}
                        <h1 class="gabarito-title">${schoolName || 'Simulado Trimestral'}</h1>
                        <p class="gabarito-subtitle">Folha de Respostas</p>
                    </div>

                    <div class="gabarito-fields">
                        <div class="field-row">
                            <div class="field">
                                <label>Nome do Aluno:</label>
                                <div class="field-line"></div>
                            </div>
                            <div class="field field-small">
                                <label>Série:</label>
                                <div class="field-line"></div>
                            </div>
                        </div>
                        <div class="field-row">
                            <div class="field">
                                <label>Data:</label>
                                <div class="field-line field-inline">
                                    <span>____</span>/<span>____</span>/<span>________</span>
                                </div>
                            </div>
                            ${showAnswers ? `<div class="gabarito-key-box">
                                <strong>GABARITO</strong>
                            </div>` : ''}
                        </div>
                    </div>

                    <table class="gabarito-table">
                        <thead>
                            <tr>${headerCols}</tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>

                    <div class="gabarito-footer">
                        <p>Questões ${startQ} a ${endQ} de ${numQuestions} | ${schoolName || 'LeGab'}</p>
                    </div>
                </div>
            `;
        }

        return pagesHTML;
    }
}

window.GabaritoGenerator = GabaritoGenerator;