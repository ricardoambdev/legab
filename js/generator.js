class GabaritoGenerator {
    constructor() {
        this.options = 'ABCDE';
    }

    generateRandomAnswers(count, numAlternatives = 5) {
        const opts = this.options.substring(0, numAlternatives);
        let result = '';
        for (let i = 0; i < count; i++) {
            result += opts[Math.floor(Math.random() * opts.length)];
        }
        return result;
    }

    generateQRData(answers, numQuestions, numAlternatives) {
        return JSON.stringify({
            type: 'legab_gabarito',
            answers: answers,
            questions: numQuestions,
            alternatives: numAlternatives,
            version: '2.0',
            generated: new Date().toISOString()
        });
    }

    validateAnswers(answers, numQuestions, numAlternatives) {
        if (!answers || typeof answers !== 'string') {
            return { valid: false, error: 'Respostas inválidas' };
        }

        const upperAnswers = answers.toUpperCase();
        const validOpts = this.options.substring(0, numAlternatives);

        for (let char of upperAnswers) {
            if (!validOpts.includes(char)) {
                return { valid: false, error: `Caractere inválido: ${char}. Use apenas ${validOpts}` };
            }
        }

        if (upperAnswers.length !== numQuestions) {
            return { valid: false, error: `Gabarito deve ter ${numQuestions} caracteres` };
        }

        return { valid: true, answers: upperAnswers };
    }

    createGabaritoHTML(numQuestions, numAlternatives, answers = null) {
        const opts = this.options.substring(0, numAlternatives);
        const questionsPerPage = 60;
        const totalPages = Math.ceil(numQuestions / questionsPerPage);
        let pagesHTML = '';

        for (let page = 0; page < totalPages; page++) {
            const startQ = page * questionsPerPage + 1;
            const endQ = Math.min(startQ + questionsPerPage - 1, numQuestions);
            const questionsOnPage = endQ - startQ + 1;
            const halfPoint = 30;
            const rowsOnPage = 30;

            let tableRows = '';
            for (let row = 0; row < rowsOnPage; row++) {
                const q1 = startQ + row;
                const q2 = startQ + row + halfPoint;

                tableRows += '<tr>';

                if (q1 >= startQ && q1 <= Math.min(startQ + halfPoint - 1, numQuestions)) {
                    const answerIndex1 = q1 - 1;
                    const correctAnswer1 = answers ? answers[answerIndex1] : null;
                    tableRows += `<td class="question-num">${q1}</td>`;
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        const alt = opts[altIndex];
                        const isCorrect = correctAnswer1 === alt;
                        tableRows += `
                            <td class="bubble-cell">
                                <div class="bubble${isCorrect ? ' correct' : ''}">${alt}</div>
                            </td>
                        `;
                    }
                } else {
                    tableRows += '<td class="question-num"></td>';
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        tableRows += '<td class="bubble-cell"></td>';
                    }
                }

                tableRows += '<td class="col-divider"></td>';

                if (q2 >= startQ + halfPoint && q2 <= numQuestions) {
                    const answerIndex2 = q2 - 1;
                    const correctAnswer2 = answers ? answers[answerIndex2] : null;
                    tableRows += `<td class="question-num">${q2}</td>`;
                    for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                        const alt = opts[altIndex];
                        const isCorrect = correctAnswer2 === alt;
                        tableRows += `
                            <td class="bubble-cell">
                                <div class="bubble${isCorrect ? ' correct' : ''}">${alt}</div>
                            </td>
                        `;
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

            const pageAnswers = answers ? answers.substring(startQ - 1, endQ) : '';
            const key1 = pageAnswers.substring(0, halfPoint);
            const key2 = pageAnswers.substring(halfPoint);

            pagesHTML += `
                <div class="gabarito-page">
                    <div class="gabarito-header">
                        <h1>LeGab - Gabarito</h1>
                        <p>Página ${page + 1} de ${totalPages}</p>
                        <div class="key-row">
                            <span class="gabarito-key">${key1}</span>
                            <span class="key-separator">|</span>
                            <span class="gabarito-key">${key2}</span>
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
                        <p>Questões ${startQ} a ${endQ} de ${numQuestions}</p>
                        <p class="footer-date">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            `;
        }

        return pagesHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const generator = new GabaritoGenerator();

    const genQuestionsInput = document.getElementById('gen-questions');
    const genAlternativesSelect = document.getElementById('gen-alternatives');
    const genAnswersInput = document.getElementById('gen-answers');
    const btnGenerate = document.getElementById('btn-generate');
    const btnCopyKey = document.getElementById('btn-copy-key');
    const btnPrint = document.getElementById('btn-print');
    const btnShowKey = document.getElementById('btn-show-key');

    const gabaritoResult = document.getElementById('gabarito-preview');
    const gabaritoPages = document.getElementById('gabarito-pages');
    const qrcodeContainer = document.getElementById('qrcode-container');

    let currentAnswers = '';
    let currentQRData = '';
    let currentNumQuestions = 60;
    let currentNumAlternatives = 5;

    genQuestionsInput.value = 60;

    btnGenerate.addEventListener('click', async () => {
        const count = parseInt(genQuestionsInput.value);
        const numAlternatives = parseInt(genAlternativesSelect.value);
        const answersInput = genAnswersInput.value.trim().toUpperCase();

        if (count < 1 || count > 200) {
            showToast('Número de questões deve ser entre 1 e 200', true);
            return;
        }

        currentNumQuestions = count;
        currentNumAlternatives = numAlternatives;
        currentAnswers = '';

        if (answersInput) {
            const validation = generator.validateAnswers(answersInput, count, numAlternatives);
            if (!validation.valid) {
                showToast(validation.error, true);
                return;
            }
            currentAnswers = answersInput;
        }

        const pagesHTML = generator.createGabaritoHTML(count, numAlternatives, null);
        gabaritoPages.innerHTML = pagesHTML;
        gabaritoResult.classList.remove('hidden');

        btnCopyKey.classList.remove('hidden');
        btnPrint.classList.remove('hidden');
        btnShowKey.classList.remove('hidden');

        qrcodeContainer.innerHTML = '';

        if (currentAnswers) {
            currentQRData = generator.generateQRData(currentAnswers, count, numAlternatives);

            QRCode.toCanvas(currentQRData, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error, canvas) => {
                if (error) {
                    console.error(error);
                    showToast('Erro ao gerar QR Code', true);
                    return;
                }
                qrcodeContainer.appendChild(canvas);
            });
        } else {
            const tempAnswers = generator.generateRandomAnswers(count, numAlternatives);
            currentQRData = generator.generateQRData(tempAnswers, count, numAlternatives);

            QRCode.toCanvas(currentQRData, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error, canvas) => {
                if (error) {
                    console.error(error);
                    return;
                }
                qrcodeContainer.appendChild(canvas);
            });

            showToast('Gabarito gerado! Forneça as respostas para ver a chave.');
        }
    });

    btnShowKey.addEventListener('click', () => {
        if (!currentAnswers) {
            const answersInput = genAnswersInput.value.trim().toUpperCase();
            if (answersInput) {
                const validation = generator.validateAnswers(
                    answersInput,
                    currentNumQuestions,
                    currentNumAlternatives
                );
                if (validation.valid) {
                    currentAnswers = answersInput;
                }
            }
        }

        if (currentAnswers) {
            const pagesHTML = generator.createGabaritoHTML(
                currentNumQuestions,
                currentNumAlternatives,
                currentAnswers
            );
            gabaritoPages.innerHTML = pagesHTML;
            btnShowKey.classList.add('hidden');
            showToast('Chave revelada!');
        } else {
            showToast('Digite as respostas corretas primeiro', true);
        }
    });

    btnCopyKey.addEventListener('click', () => {
        if (!currentAnswers) {
            showToast('Gere o gabarito com respostas primeiro', true);
            return;
        }

        const dataToCopy = JSON.stringify({
            answers: currentAnswers,
            questions: currentNumQuestions,
            alternatives: currentNumAlternatives
        });

        navigator.clipboard.writeText(dataToCopy).then(() => {
            showToast('Chave copiada!');
        }).catch(() => {
            showToast('Erro ao copiar', true);
        });
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });
});

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

window.GabaritoGenerator = GabaritoGenerator;