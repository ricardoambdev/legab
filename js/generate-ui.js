let currentAnswers = [];
let currentConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    const configManager = new ConfigManager();
    const generator = new GabaritoGenerator();

    const genAnswersInput = document.getElementById('gen-answers');
    const genCounter = document.getElementById('gen-counter');
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
    const noConfigMsg = document.getElementById('no-config-msg');
    const generateSection = document.getElementById('generate-section');

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `md-toast ${isError ? 'error' : 'success'} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function getAlternativesText() {
        const num = currentConfig?.numAlternatives || 5;
        return 'ABCDE'.substring(0, num);
    }

    function getTotalQuestions() {
        return currentConfig?.numQuestions || 65;
    }

    function updateCounter() {
        const total = getTotalQuestions();
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
        const numQuestions = getTotalQuestions();

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
        currentAnswers = new Array(getTotalQuestions()).fill(null);
        updateInput();
        updateCounter();
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    function randomAnswers() {
        const alts = getAlternativesText();
        currentAnswers = [];
        for (let i = 0; i < getTotalQuestions(); i++) {
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

    function updateSummary() {
        if (currentConfig) {
            document.getElementById('summary-questions').textContent = currentConfig.numQuestions;
            document.getElementById('summary-columns').textContent =
                `${currentConfig.leftColumn} + ${currentConfig.rightColumn}`;
            document.getElementById('summary-alts').textContent = currentConfig.numAlternatives;
        }
    }

    function loadConfig() {
        const numQuestions = getTotalQuestions();
        const oldLen = currentAnswers.length;
        const newLen = numQuestions;

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
        updateSummary();
    }

    btnClear.addEventListener('click', clearAnswers);
    btnRandom.addEventListener('click', randomAnswers);

    btnGenerate.addEventListener('click', async () => {
        if (!currentConfig) {
            showToast('Configure o gabarito primeiro!', true);
            return;
        }

        const answers = currentAnswers.map(a => a || '').join('');
        if (answers.length !== getTotalQuestions()) {
            showToast(`Complete todas as ${getTotalQuestions()} questões`, true);
            return;
        }

        const configData = {
            numQuestions: currentConfig.numQuestions,
            numAlternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn,
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
        if (!currentConfig) return;

        const answers = currentAnswers.map(a => a || '').join('');
        const configData = {
            numQuestions: currentConfig.numQuestions,
            numAlternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn,
            answers: answers
        };

        const pagesHTML = generator.createGabaritoHTML(configData, answers);
        gabaritoPages.innerHTML = pagesHTML;
        showToast('Chave revelada!');
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    configManager.onReady(async () => {
        const config = await configManager.getConfig();

        if (!config || !config.correctAnswers) {
            noConfigMsg.classList.remove('hidden');
            generateSection.classList.add('hidden');
            return;
        }

        currentConfig = config;
        noConfigMsg.classList.add('hidden');
        generateSection.classList.remove('hidden');

        currentAnswers = config.correctAnswers.toUpperCase().split('');

        loadConfig();
    });
});