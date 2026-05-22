let currentAnswers = [];
let currentConfig = {
    numQuestions: 65,
    numAlternatives: 5,
    leftColumn: 33,
    rightColumn: 32
};

document.addEventListener('DOMContentLoaded', async () => {
    const configManager = new ConfigManager();
    const generator = new GabaritoGenerator();

    const genQuestionsInput = document.getElementById('gen-questions');
    const genAlternativesSelect = document.getElementById('gen-alternatives');
    const genLeftInput = document.getElementById('gen-left');
    const genRightInput = document.getElementById('gen-right');
    const genAnswersInput = document.getElementById('gen-answers');
    const genCounter = document.getElementById('gen-counter');
    const btnLoadConfig = document.getElementById('btn-load-config');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    const btnRandom = document.getElementById('btn-random');
    const btnCopy = document.getElementById('btn-copy');
    const btnShowKey = document.getElementById('btn-show-key');
    const btnPrint = document.getElementById('btn-print');
    const answerRows = document.getElementById('answer-rows');
    const altLabels = document.getElementById('alt-labels');
    const gabaritoPreview = document.getElementById('gabarito-preview');
    const gabaritoPages = document.getElementById('gabarito-pages');
    const qrSection = document.getElementById('qr-section');
    const qrcodeContainer = document.getElementById('qrcode-container');

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `md-toast ${isError ? 'error' : 'success'} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function getAlternativesText() {
        const num = currentConfig.numAlternatives;
        return 'ABCDE'.substring(0, num);
    }

    function updateCounter() {
        const total = currentConfig.numQuestions;
        const current = currentAnswers.filter(a => a !== null && a !== undefined).length;
        genCounter.textContent = `${current}/${total}`;

        if (current === total) {
            genCounter.classList.add('success');
            genCounter.classList.remove('error');
        } else {
            genCounter.classList.remove('success');
            if (current > 0) {
                genCounter.classList.add('error');
            } else {
                genCounter.classList.remove('error');
            }
        }
    }

    function renderLabels() {
        const alts = getAlternativesText();
        altLabels.innerHTML = alts.split('').map(a =>
            `<span class="answer-alt-label">${a}</span>`
        ).join('');
    }

    function renderRows() {
        const alts = getAlternativesText();
        const numQuestions = currentConfig.numQuestions;

        let html = '';
        for (let i = 0; i < numQuestions; i++) {
            const selectedAnswer = currentAnswers[i] || null;
            html += `
                <div class="answer-row" data-question="${i + 1}">
                    <div class="answer-row-num">${i + 1}</div>
                    <div class="answer-row-alts">
                        ${alts.split('').map(a => `
                            <button class="answer-btn ${selectedAnswer === a ? 'selected' : ''}"
                                    data-alt="${a}" data-question="${i + 1}">
                                ${a}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        answerRows.innerHTML = html;

        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = parseInt(btn.dataset.question);
                const alt = btn.dataset.alt;
                selectAnswer(question, alt);
            });
        });
    }

    function selectAnswer(question, alt) {
        const index = question - 1;
        currentAnswers[index] = alt;
        updateInput();
        updateCounter();

        const row = document.querySelector(`.answer-row[data-question="${question}"]`);
        if (row) {
            row.querySelectorAll('.answer-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.alt === alt);
            });
        }
    }

    function updateInput() {
        const gabarito = currentAnswers.map(a => a || '').join('');
        genAnswersInput.value = gabarito;
    }

    function clearAnswers() {
        currentAnswers = new Array(currentConfig.numQuestions).fill(null);
        updateInput();
        updateCounter();
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    function randomAnswers() {
        const alts = getAlternativesText();
        currentAnswers = [];
        for (let i = 0; i < currentConfig.numQuestions; i++) {
            const randomAlt = alts[Math.floor(Math.random() * alts.length)];
            currentAnswers.push(randomAlt);
        }
        updateInput();
        updateCounter();
        document.querySelectorAll('.answer-btn').forEach(btn => {
            const question = parseInt(btn.dataset.question);
            const index = question - 1;
            btn.classList.toggle('selected', btn.dataset.alt === currentAnswers[index]);
        });
    }

    function rebuildUI() {
        const oldLen = currentAnswers.length;
        const newLen = currentConfig.numQuestions;

        if (newLen > oldLen) {
            for (let i = oldLen; i < newLen; i++) {
                currentAnswers.push(null);
            }
        } else if (newLen < oldLen) {
            currentAnswers = currentAnswers.slice(0, newLen);
        }

        renderLabels();
        renderRows();
        updateInput();
        updateCounter();
    }

    function updateConfigFromInputs() {
        currentConfig.numQuestions = parseInt(genQuestionsInput.value) || 65;
        currentConfig.numAlternatives = parseInt(genAlternativesSelect.value) || 5;
        currentConfig.leftColumn = parseInt(genLeftInput.value) || 33;
        currentConfig.rightColumn = parseInt(genRightInput.value) || 32;
    }

    genQuestionsInput.addEventListener('change', () => {
        const total = parseInt(genLeftInput.value) + parseInt(genRightInput.value);
        if (parseInt(genQuestionsInput.value) !== total) {
            showToast(`Colunas devem somar ${genQuestionsInput.value}`, true);
        }
        rebuildUI();
    });

    genAlternativesSelect.addEventListener('change', () => {
        currentAnswers = currentAnswers.map(a => {
            const alts = getAlternativesText();
            return alts.includes(a) ? a : null;
        });
        rebuildUI();
    });

    genLeftInput.addEventListener('change', () => {
        const total = parseInt(genLeftInput.value) + parseInt(genRightInput.value);
        genQuestionsInput.value = total;
        rebuildUI();
    });

    genRightInput.addEventListener('change', () => {
        const total = parseInt(genLeftInput.value) + parseInt(genRightInput.value);
        genQuestionsInput.value = total;
        rebuildUI();
    });

    btnClear.addEventListener('click', clearAnswers);
    btnRandom.addEventListener('click', randomAnswers);

    btnLoadConfig.addEventListener('click', async () => {
        try {
            const config = await configManager.getConfig();
            if (config) {
                genQuestionsInput.value = config.numQuestions;
                genAlternativesSelect.value = config.numAlternatives;
                genLeftInput.value = config.leftColumn;
                genRightInput.value = config.rightColumn;

                if (config.correctAnswers) {
                    currentAnswers = config.correctAnswers.toUpperCase().split('');
                } else {
                    currentAnswers = new Array(config.numQuestions).fill(null);
                }

                currentConfig = { ...config };
                rebuildUI();
                showToast('Configuração carregada!');
            } else {
                showToast('Nenhuma configuração encontrada', true);
            }
        } catch (error) {
            showToast('Erro: ' + error.message, true);
        }
    });

    btnGenerate.addEventListener('click', async () => {
        updateConfigFromInputs();

        const total = currentConfig.leftColumn + currentConfig.rightColumn;
        if (currentConfig.numQuestions !== total) {
            showToast(`Colunas devem somar ${currentConfig.numQuestions}`, true);
            return;
        }

        const answers = currentAnswers.map(a => a || '').join('');
        if (answers.length !== currentConfig.numQuestions) {
            showToast(`Complete todas as ${currentConfig.numQuestions} questões`, true);
            return;
        }

        const configData = {
            ...currentConfig,
            answers: answers
        };

        const pagesHTML = generator.createGabaritoHTML(configData, null);
        gabaritoPages.innerHTML = pagesHTML;
        gabaritoPreview.classList.remove('hidden');
        qrSection.classList.remove('hidden');

        qrcodeContainer.innerHTML = '';

        const qrData = generator.generateQRData(answers, configData);

        QRCode.toCanvas(qrData, {
            width: 200,
            margin: 2
        }, (error, canvas) => {
            if (error) {
                console.error(error);
                return;
            }
            qrcodeContainer.appendChild(canvas);
        });

        gabaritoPreview.scrollIntoView({ behavior: 'smooth' });
    });

    btnCopy.addEventListener('click', () => {
        const answers = currentAnswers.map(a => a || '').join('');
        const dataToCopy = JSON.stringify({
            answers: answers,
            questions: currentConfig.numQuestions,
            alternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn
        });

        navigator.clipboard.writeText(dataToCopy).then(() => {
            showToast('Chave copiada!');
        }).catch(() => {
            showToast('Erro ao copiar', true);
        });
    });

    btnShowKey.addEventListener('click', () => {
        const answers = currentAnswers.map(a => a || '').join('');
        const configData = {
            ...currentConfig,
            answers: answers
        };

        const pagesHTML = generator.createGabaritoHTML(configData, answers);
        gabaritoPages.innerHTML = pagesHTML;
        showToast('Chave revelada!');
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    renderLabels();
    renderRows();
    updateCounter();

    const config = await configManager.getConfig();
    if (config) {
        genQuestionsInput.value = config.numQuestions;
        genAlternativesSelect.value = config.numAlternatives;
        genLeftInput.value = config.leftColumn;
        genRightInput.value = config.rightColumn;

        if (config.correctAnswers) {
            currentAnswers = config.correctAnswers.toUpperCase().split('');
        } else {
            currentAnswers = new Array(config.numQuestions).fill(null);
        }

        currentConfig = { ...config };
        rebuildUI();
    }
});