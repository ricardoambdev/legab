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
        const questionsPerPage = 10;
        const totalPages = Math.ceil(numQuestions / questionsPerPage);
        let pagesHTML = '';

        for (let page = 0; page < totalPages; page++) {
            const startQ = page * questionsPerPage + 1;
            const endQ = Math.min(startQ + questionsPerPage - 1, numQuestions);

            let tableRows = '';
            for (let q = startQ; q <= endQ; q++) {
                const answerIndex = q - 1;
                const correctAnswer = answers ? answers[answerIndex] : null;

                let cells = `<td class="question-num">${q}</td>`;

                for (let altIndex = 0; altIndex < numAlternatives; altIndex++) {
                    const alt = opts[altIndex];
                    const isCorrect = correctAnswer === alt;
                    cells += `
                        <td class="bubble-cell">
                            <div class="bubble${isCorrect ? ' correct' : ''}">${alt}</div>
                        </td>
                    `;
                }
                tableRows += `<tr>${cells}</tr>`;
            }

            const headerCols = `<th class="question-num">Q</th>` +
                opts.split('').map(alt => `<th class="alt-header">${alt}</th>`).join('');

            const pageAnswers = answers ? answers.substring(startQ - 1, endQ) : '';

            pagesHTML += `
                <div class="gabarito-page">
                    <div class="gabarito-header">
                        <h1>LeGab - Gabarito</h1>
                        <p>Página ${page + 1} de ${totalPages}</p>
                        ${pageAnswers ? `<div class="gabarito-key">${pageAnswers}</div>` : ''}
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
                        <p>${answers ? 'Gabarito para Correção' : 'Gabarito para Preenchimento'}</p>
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
    let currentNumQuestions = 0;
    let currentNumAlternatives = 5;

    function updateGabarito(answers = null) {
        const pagesHTML = generator.createGabaritoHTML(
            currentNumQuestions,
            currentNumAlternatives,
            answers
        );
        gabaritoPages.innerHTML = pagesHTML;
    }

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

        updateGabarito();
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
            updateGabarito(currentAnswers);
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