let currentAnswers = [];
let currentConfig = {
    numQuestions: 65,
    numAlternatives: 5,
    leftColumn: 33,
    rightColumn: 32,
    passingScore: 60,
    schoolName: '',
    logoUrl: ''
};

document.addEventListener('DOMContentLoaded', async () => {
    const configManager = new ConfigManager();

    const numQuestionsInput = document.getElementById('num-questions');
    const numAlternativesSelect = document.getElementById('num-alternatives');
    const leftColumnInput = document.getElementById('left-column');
    const rightColumnInput = document.getElementById('right-column');
    const passingScoreInput = document.getElementById('passing-score');
    const schoolNameInput = document.getElementById('school-name');
    const logoUrlInput = document.getElementById('logo-url');
    const logoPreview = document.getElementById('logo-preview');
    const logoImg = document.getElementById('logo-img');
    const correctAnswersInput = document.getElementById('correct-answers');
    const answersCounter = document.getElementById('answers-counter');
    const btnSave = document.getElementById('btn-save-config');
    const btnLoad = document.getElementById('btn-load-config');
    const btnClear = document.getElementById('btn-clear');
    const btnRandom = document.getElementById('btn-random');
    const answerRows = document.getElementById('answer-rows');
    const altLabels = document.getElementById('alt-labels');

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `md-toast ${isError ? 'error' : 'success'} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function updateAnswerCounter() {
        const total = currentConfig.numQuestions;
        const current = currentAnswers.filter(a => a !== null && a !== undefined).length;
        answersCounter.textContent = `${current}/${total}`;

        if (current === total) {
            answersCounter.classList.add('success');
            answersCounter.classList.remove('error');
        } else {
            answersCounter.classList.remove('success');
            if (current > 0) {
                answersCounter.classList.add('error');
            } else {
                answersCounter.classList.remove('error');
            }
        }
    }

    function getAlternativesText() {
        const num = currentConfig.numAlternatives;
        return 'ABCDE'.substring(0, num);
    }

    function renderAlternativesLabels() {
        const alts = getAlternativesText();
        altLabels.innerHTML = alts.split('').map(a =>
            `<span class="answer-alt-label">${a}</span>`
        ).join('');
    }

    function renderAnswerRows() {
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
        updateGabaritoInput();
        updateAnswerCounter();

        const row = document.querySelector(`.answer-row[data-question="${question}"]`);
        if (row) {
            row.querySelectorAll('.answer-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.alt === alt);
            });
        }
    }

    function clearAnswers() {
        currentAnswers = new Array(currentConfig.numQuestions).fill(null);
        updateGabaritoInput();
        updateAnswerCounter();
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
        updateGabaritoInput();
        updateAnswerCounter();
        document.querySelectorAll('.answer-btn').forEach(btn => {
            const question = parseInt(btn.dataset.question);
            const index = question - 1;
            btn.classList.toggle('selected', btn.dataset.alt === currentAnswers[index]);
        });
    }

    function updateGabaritoInput() {
        const gabarito = currentAnswers.map(a => a || '').join('');
        correctAnswersInput.value = gabarito;
    }

    function updateConfigFromInputs() {
        currentConfig.numQuestions = parseInt(numQuestionsInput.value) || 65;
        currentConfig.numAlternatives = parseInt(numAlternativesSelect.value) || 5;
        currentConfig.leftColumn = parseInt(leftColumnInput.value) || 33;
        currentConfig.rightColumn = parseInt(rightColumnInput.value) || 32;
        currentConfig.passingScore = parseInt(passingScoreInput.value) || 60;
        currentConfig.schoolName = schoolNameInput.value.trim();
        currentConfig.logoUrl = logoUrlInput.value.trim();
    }

    function rebuildUI() {
        updateConfigFromInputs();

        const oldLen = currentAnswers.length;
        const newLen = currentConfig.numQuestions;

        if (newLen > oldLen) {
            for (let i = oldLen; i < newLen; i++) {
                currentAnswers.push(null);
            }
        } else if (newLen < oldLen) {
            currentAnswers = currentAnswers.slice(0, newLen);
        }

        renderAlternativesLabels();
        renderAnswerRows();
        updateGabaritoInput();
        updateAnswerCounter();
    }

    logoUrlInput.addEventListener('change', () => {
        const url = logoUrlInput.value.trim();
        if (url) {
            logoImg.src = url;
            logoPreview.classList.remove('hidden');
            logoImg.onerror = () => {
                logoPreview.classList.add('hidden');
            };
        } else {
            logoPreview.classList.add('hidden');
        }
    });

    numQuestionsInput.addEventListener('change', rebuildUI);
    numAlternativesSelect.addEventListener('change', () => {
        currentAnswers = currentAnswers.map(a => {
            const alts = getAlternativesText();
            return alts.includes(a) ? a : null;
        });
        rebuildUI();
    });

    btnClear.addEventListener('click', clearAnswers);
    btnRandom.addEventListener('click', randomAnswers);

    // Test gabarito button
    const btnTestGabarito = document.getElementById('btn-test-gabarito');
    if (btnTestGabarito) {
        btnTestGabarito.addEventListener('click', () => {
            // Open new window with test gabarito
            const numQ = currentConfig.numQuestions || 60;
            const numA = currentConfig.numAlternatives || 5;
            const left = currentConfig.leftColumn || 30;
            const right = currentConfig.rightColumn || 30;
            const opts = 'ABCDE'.substring(0, numA);
            
            // Generate gabarito with answers in black
            let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Teste Gabarito</title>';
            html += '<style>';
            html += `*{margin:0;padding:0;box-sizing:border-box}body{font-family:Roboto,sans-serif;background:#fff;padding:20px}.gabarito{text-align:center}h1{color:#333;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#333;color:#fff;padding:8px 4px;font-size:12px}td{border:2px solid #333;padding:0;text-align:center}.q-num{background:#eee;width:30px;font-weight:700}.alt-head{width:30px}.sep{width:8px;background:#333;border:none}.bubble{width:24px;height:24px;border:2px solid #333;border-radius:4px;margin:2px auto;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;background:#fff}.bubble.filled{background:#000;border-color:#000;color:#fff}tr:nth-child(even){background:#f5f5f5}`;
            html += '</style></head><body>';
            html += '<div class="gabarito"><h1>Gabarito de Teste</h1><p>Aponte a câmera para testar</p>';
            
            const totalPages = Math.ceil(numQ / (left + right));
            for (let p = 0; p < totalPages; p++) {
                const startQ = p * (left + right) + 1;
                const endQ = Math.min(startQ + left + right - 1, numQ);
                
                html += '<h2>Questões ' + startQ + '-' + endQ + '</h2><table><thead><tr><th class="q-num">Q</th>';
                for (let a = 0; a < numA; a++) html += '<th class="alt-head">' + opts[a] + '</th>';
                html += '<th class="sep"></th><th class="q-num">Q</th>';
                for (let a = 0; a < numA; a++) html += '<th class="alt-head">' + opts[a] + '</th>';
                html += '</tr></thead><tbody>';
                
                for (let r = 0; r < left; r++) {
                    const q1 = startQ + r;
                    const q2 = startQ + r + left;
                    html += '<tr>';
                    
                    if (q1 <= Math.min(startQ + left - 1, numQ)) {
                        html += '<td class="q-num">' + q1 + '</td>';
                        const ans1 = currentConfig.correctAnswers[q1-1] || 'A';
                        for (let a = 0; a < numA; a++) {
                            const filled = opts[a] === ans1 ? 'filled' : '';
                            html += '<td><div class="bubble ' + filled + '">' + opts[a] + '</div></td>';
                        }
                    } else {
                        html += '<td class="q-num"></td>';
                        for (let a = 0; a < numA; a++) html += '<td></td>';
                    }
                    
                    html += '<td class="sep"></td>';
                    
                    if (q2 <= numQ) {
                        html += '<td class="q-num">' + q2 + '</td>';
                        const ans2 = currentConfig.correctAnswers[q2-1] || 'A';
                        for (let a = 0; a < numA; a++) {
                            const filled = opts[a] === ans2 ? 'filled' : '';
                            html += '<td><div class="bubble ' + filled + '">' + opts[a] + '</div></td>';
                        }
                    } else {
                        html += '<td class="q-num"></td>';
                        for (let a = 0; a < numA; a++) html += '<td></td>';
                    }
                    
                    html += '</tr>';
                }
                
                html += '</tbody></table>';
            }
            
            html += '</div></body></html>';
            
            const w = window.open('', '_blank');
            w.document.write(html);
            w.document.close();
        });
    }

    btnSave.addEventListener('click', async () => {
        updateConfigFromInputs();

        const total = currentConfig.leftColumn + currentConfig.rightColumn;
        if (currentConfig.numQuestions !== total) {
            showToast(`Colunas devem somar ${currentConfig.numQuestions}`, true);
            return;
        }

        const gabarito = currentAnswers.map(a => a || '').join('');
        if (gabarito.length !== currentConfig.numQuestions) {
            showToast(`Complete todas as ${currentConfig.numQuestions} questões`, true);
            return;
        }

        const config = {
            ...currentConfig,
            correctAnswers: gabarito,
            updatedAt: new Date().toISOString()
        };

        try {
            await configManager.saveConfig(config);
            showToast('Configurações salvas!');
            updateDisplay();
        } catch (error) {
            showToast('Erro: ' + error.message, true);
        }
    });

    btnLoad.addEventListener('click', async () => {
        try {
            const config = await configManager.getConfig();
            if (config) {
                numQuestionsInput.value = config.numQuestions;
                numAlternativesSelect.value = config.numAlternatives;
                leftColumnInput.value = config.leftColumn;
                rightColumnInput.value = config.rightColumn;
                passingScoreInput.value = config.passingScore;
                schoolNameInput.value = config.schoolName || '';
                logoUrlInput.value = config.logoUrl || '';

                if (config.logoUrl) {
                    logoImg.src = config.logoUrl;
                    logoPreview.classList.remove('hidden');
                }

                if (config.correctAnswers) {
                    currentAnswers = config.correctAnswers.toUpperCase().split('');
                } else {
                    currentAnswers = new Array(config.numQuestions).fill(null);
                }

                currentConfig = { ...config };
                rebuildUI();
                showToast('Configuração carregada!');
                updateDisplay();
            } else {
                showToast('Nenhuma configuração encontrada', true);
            }
        } catch (error) {
            showToast('Erro: ' + error.message, true);
        }
    });

    async function updateDisplay() {
        const config = await configManager.getConfig();
        if (config) {
            document.getElementById('display-school').textContent = config.schoolName || '-';
            document.getElementById('display-questions').textContent = config.numQuestions;
            document.getElementById('display-alternatives').textContent = config.numAlternatives;
            document.getElementById('display-columns').textContent = `${config.leftColumn} + ${config.rightColumn}`;
            document.getElementById('display-passing').textContent = config.passingScore;
        }
    }

    configManager.onReady(() => {
        document.getElementById('config-status').textContent = 'Status: Conectado';
    });

    configManager.onError(() => {
        document.getElementById('config-status').textContent = 'Status: LocalStorage';
    });

    renderAlternativesLabels();
    renderAnswerRows();
    updateAnswerCounter();

    const config = await configManager.getConfig();
    if (config) {
        numQuestionsInput.value = config.numQuestions;
        numAlternativesSelect.value = config.numAlternatives;
        leftColumnInput.value = config.leftColumn;
        rightColumnInput.value = config.rightColumn;
        passingScoreInput.value = config.passingScore;
        schoolNameInput.value = config.schoolName || '';
        logoUrlInput.value = config.logoUrl || '';

        if (config.logoUrl) {
            logoImg.src = config.logoUrl;
            logoPreview.classList.remove('hidden');
        }

        if (config.correctAnswers) {
            currentAnswers = config.correctAnswers.toUpperCase().split('');
        } else {
            currentAnswers = new Array(config.numQuestions).fill(null);
        }

        currentConfig = { ...config };
        rebuildUI();
    }

    updateDisplay();
});