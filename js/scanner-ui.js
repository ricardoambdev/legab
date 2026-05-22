class GabaritoOCR {
    constructor() {
        this.worker = null;
        this.ready = false;
    }

    async init() {
        if (this.ready) return true;

        try {
            addDebugLog('Iniciando OCR...');
            const worker = await Tesseract.createWorker('por', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        updateLoadingStatus(`OCR: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            this.worker = worker;
            this.ready = true;
            addDebugLog('OCR pronto!');
            return true;
        } catch (error) {
            console.error('Erro OCR:', error);
            addDebugLog('ERRO: ' + error.message);
            throw error;
        }
    }

    async processImage(imageSource) {
        if (!this.ready || !this.worker) {
            throw new Error('OCR não está pronto');
        }

        try {
            addDebugLog('Processando imagem...');
            const result = await this.worker.recognize(imageSource);
            return result.data.text;
        } catch (error) {
            console.error('Erro reconhecimento:', error);
            throw new Error('Falha ao processar imagem');
        }
    }

    parseGabaritoFromImage(canvas, config) {
        addDebugLog('Analisando bolhas...');

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        addDebugLog(`Imagem: ${width}x${height}`);

        const numQuestions = config.numQuestions || 65;
        const numAlternatives = config.numAlternatives || 5;
        const leftColumn = config.leftColumn || 33;
        const rightColumn = config.rightColumn || 32;
        const totalPerPage = leftColumn + rightColumn;

        const answers = new Array(numQuestions).fill('');
        let detected = 0;

        const sectionHeight = height / (leftColumn + 2);
        const headerHeight = sectionHeight * 0.3;

        for (let q = 0; q < numQuestions; q++) {
            const isLeftColumn = q < leftColumn;
            const rowInColumn = q % leftColumn;
            const colOffset = isLeftColumn ? 0 : (width / 2);

            const xStart = colOffset + 30;
            const yStart = headerHeight + (rowInColumn * sectionHeight) + (sectionHeight * 0.15);
            const bubbleWidth = (width / 2 - 60) / numAlternatives;

            let maxDarkness = 0;
            let selectedAlt = '';

            for (let alt = 0; alt < numAlternatives; alt++) {
                const x = xStart + (alt * bubbleWidth) + (bubbleWidth / 2);
                const y = yStart + (sectionHeight * 0.35);

                const darkness = this.getBubbleDarkness(ctx, x, y, bubbleWidth * 0.4, config);

                if (darkness > maxDarkness) {
                    maxDarkness = darkness;
                    selectedAlt = 'ABCDE'[alt];
                }
            }

            if (maxDarkness > 0.3) {
                answers[q] = selectedAlt;
                detected++;
            }
        }

        addDebugLog(`Detectadas ${detected}/${numQuestions} respostas`);
        return answers.join('');
    }

    getBubbleDarkness(ctx, cx, cy, radius, config) {
        const samples = 8;
        let darkPixels = 0;
        let totalPixels = 0;

        for (let i = 0; i < samples; i++) {
            const angle = (i / samples) * Math.PI * 2;
            const r = radius * 0.6;
            const px = Math.round(cx + Math.cos(angle) * r);
            const py = Math.round(cy + Math.sin(angle) * r);

            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist <= 3) {
                        const pixel = ctx.getImageData(px + dx, py + dy, 1, 1).data;
                        const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
                        if (brightness < 180) {
                            darkPixels++;
                        }
                        totalPixels++;
                    }
                }
            }
        }

        return darkPixels / totalPixels;
    }

    parseGabarito(text, config) {
        addDebugLog('Analisando texto OCR...');

        if (!text || typeof text !== 'string') {
            return '';
        }

        const lines = text.split('\n').filter(line => line.trim());
        addDebugLog(`Linhas detectadas: ${lines.length}`);

        const numQuestions = config.numQuestions || 65;
        const numAlternatives = config.numAlternatives || 5;
        const options = 'ABCDE'.substring(0, numAlternatives);

        const answers = new Array(numQuestions).fill('');
        let foundCount = 0;

        for (const line of lines) {
            const cleanLine = line.toUpperCase().replace(/[^A-E0-9\s]/g, ' ').trim();

            const numberAnswerPairs = cleanLine.match(/(\d+)[\s]+([A-E])/gi);
            if (numberAnswerPairs) {
                for (const pair of numberAnswerPairs) {
                    const match = pair.match(/(\d+)[\s]+([A-E])/i);
                    if (match) {
                        const qNum = parseInt(match[1]);
                        const answer = match[2].toUpperCase();
                        if (qNum >= 1 && qNum <= numQuestions && options.includes(answer)) {
                            answers[qNum - 1] = answer;
                            foundCount++;
                        }
                    }
                }
            }

            const parts = cleanLine.split(/\s+/).filter(p => p.length > 0);
            for (let i = 0; i < parts.length; i++) {
                const numMatch = parts[i].match(/^(\d+)$/);
                if (numMatch) {
                    const questionNum = parseInt(numMatch[1]);
                    if (questionNum >= 1 && questionNum <= numQuestions) {
                        for (let j = i + 1; j < parts.length && j <= i + numAlternatives; j++) {
                            const candidate = parts[j].replace(/[^\w]/g, '').toUpperCase();
                            if (options.includes(candidate) && candidate.length === 1) {
                                if (answers[questionNum - 1] === '') {
                                    answers[questionNum - 1] = candidate;
                                    foundCount++;
                                }
                                i = j;
                                break;
                            }
                        }
                    }
                }
            }
        }

        addDebugLog(`Texto OCR encontrou ${foundCount} respostas`);
        return answers.join('');
    }
}

class Scanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.ocr = null;
    }

    async start(onError) {
        try {
            addDebugLog('Iniciando câmera...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 }
                },
                audio: false
            });

            this.video = document.getElementById('video');
            this.canvas = document.getElementById('canvas');

            this.video.srcObject = this.stream;
            await new Promise(resolve => {
                this.video.onloadedmetadata = resolve;
            });
            await this.video.play();

            addDebugLog(`Câmera: ${this.video.videoWidth}x${this.video.videoHeight}`);

            document.getElementById('btn-start').classList.add('hidden');
            document.getElementById('btn-capture').classList.remove('hidden');
            document.getElementById('btn-stop').classList.remove('hidden');
            document.getElementById('scanner-overlay').style.display = 'flex';

            return true;
        } catch (error) {
            console.error('Erro câmera:', error);
            addDebugLog('ERRO: ' + error.message);
            if (onError) onError(error);
            return false;
        }
    }

    async captureAndProcess(config) {
        const ctx = this.canvas.getContext('2d');
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;

        addDebugLog(`Captura: ${width}x${height}`);

        this.canvas.width = width;
        this.canvas.height = height;
        ctx.drawImage(this.video, 0, 0);

        addDebugLog('Analisando imagem...');

        this.ocr = new GabaritoOCR();
        await this.ocr.init();

        updateLoadingStatus('Detectando bolhas...');
        const bubbleAnswers = this.ocr.parseGabaritoFromImage(this.canvas, config);
        addDebugLog(`Bolhas: ${bubbleAnswers}`);

        updateLoadingStatus('Processando OCR de texto...');
        const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
        const ocrText = await this.ocr.processImage(imageData);

        updateLoadingStatus('Combinando resultados...');
        const textAnswers = this.ocr.parseGabarito(ocrText, config);

        addDebugLog(`Texto: ${textAnswers}`);

        const finalAnswers = this.mergeResults(bubbleAnswers, textAnswers, config);
        addDebugLog(`Final: ${finalAnswers}`);

        return finalAnswers;
    }

    mergeResults(bubbleAnswers, textAnswers, config) {
        const numQuestions = config.numQuestions || 65;
        const result = new Array(numQuestions).fill('');

        for (let i = 0; i < numQuestions; i++) {
            if (bubbleAnswers[i] && bubbleAnswers[i] !== '') {
                result[i] = bubbleAnswers[i];
            } else if (textAnswers[i] && textAnswers[i] !== '') {
                result[i] = textAnswers[i];
            }
        }

        return result.join('');
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
        }

        document.getElementById('btn-start').classList.remove('hidden');
        document.getElementById('btn-capture').classList.add('hidden');
        document.getElementById('btn-stop').classList.add('hidden');
        document.getElementById('scanner-overlay').style.display = 'none';
    }
}

class GradeChecker {
    checkAnswers(userAnswers, config) {
        const correctAnswers = config.correctAnswers.toUpperCase();
        const answers = userAnswers.toUpperCase();

        let correct = 0;
        let wrong = 0;
        let blank = 0;

        const total = correctAnswers.length;

        for (let i = 0; i < total; i++) {
            const correctChar = correctAnswers[i];
            const userChar = answers[i] || '';

            if (!userChar || userChar === '' || userChar === '-') {
                blank++;
                wrong++;
            } else if (correctChar === userChar) {
                correct++;
            } else {
                wrong++;
            }
        }

        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        return {
            correct,
            wrong,
            blank,
            total,
            percentage,
            passingScore: config.passingScore || 60,
            passed: percentage >= (config.passingScore || 60)
        };
    }
}

let scanner = null;
let gradeChecker = null;
let configManager = null;

function addDebugLog(message) {
    console.log(message);
    const debugLog = document.getElementById('debug-log');
    const debugSection = document.getElementById('debug-section');
    if (debugLog) {
        const time = new Date().toLocaleTimeString();
        debugLog.innerHTML += `<p>[${time}] ${message}</p>`;
        debugSection.classList.remove('hidden');
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `md-toast ${isError ? 'error' : 'success'} show`;
    setTimeout(() => toast.classList.remove('show'), 4000);
}

function showLoading(show) {
    document.getElementById('loading-section').classList.toggle('hidden', !show);
    if (show) {
        document.getElementById('result-section').classList.add('hidden');
    }
}

function updateLoadingStatus(text) {
    const el = document.getElementById('loading-status');
    if (el) {
        el.textContent = text;
    }
}

function displayResults(result) {
    document.getElementById('correct-count').textContent = result.correct;
    document.getElementById('wrong-count').textContent = result.wrong;
    document.getElementById('blank-count').textContent = result.blank;
    document.getElementById('score-percent').textContent = result.percentage + '%';

    const passFail = document.getElementById('pass-fail');
    if (result.passed) {
        passFail.textContent = 'Aprovado!';
        passFail.className = 'pass-fail passed';
    } else {
        passFail.textContent = 'Reprovado';
        passFail.className = 'pass-fail failed';
    }

    document.getElementById('result-section').classList.remove('hidden');
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', async () => {
    scanner = new Scanner();
    gradeChecker = new GradeChecker();
    configManager = new ConfigManager();

    addDebugLog('Carregando scanner...');

    const config = await configManager.getConfig();
    if (config) {
        document.getElementById('config-questions').textContent = config.numQuestions || 65;
        document.getElementById('config-alternatives').textContent = config.numAlternatives || 5;
    }

    const btnStart = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnCheck = document.getElementById('btn-check');
    const manualInput = document.getElementById('manual-answers');

    btnStart.addEventListener('click', async () => {
        showToast('Iniciando câmera...');
        const success = await scanner.start(
            (error) => showToast('Erro: ' + error.message, true)
        );
        if (!success) {
            showToast('Não foi possível iniciar a câmera', true);
        }
    });

    btnCapture.addEventListener('click', async () => {
        try {
            const cfg = await configManager.getConfig();

            if (!cfg) {
                showToast('Configure o gabarito primeiro!', true);
                return;
            }

            if (!cfg.correctAnswers) {
                showToast('Gabarito não configurado!', true);
                return;
            }

            addDebugLog('Iniciando captura...');
            showLoading(true);
            updateLoadingStatus('Capturando...');

            const detectedAnswers = await scanner.captureAndProcess(cfg);
            addDebugLog(`Resultado: ${detectedAnswers}`);

            if (!detectedAnswers || detectedAnswers.length === 0) {
                showToast('Nenhuma resposta detectada. Tente melhorar a iluminação.', true);
                showLoading(false);
                return;
            }

            showToast(`Detectado: ${detectedAnswers}`);

            const result = gradeChecker.checkAnswers(detectedAnswers, cfg);
            displayResults(result);
            showLoading(false);

            addDebugLog(`Sucesso: ${result.correct} acertos`);

        } catch (error) {
            console.error('Erro:', error);
            addDebugLog('ERRO: ' + error.message);
            showToast('Erro: ' + error.message, true);
            showLoading(false);
        }
    });

    btnStop.addEventListener('click', () => {
        scanner.stop();
    });

    btnCheck.addEventListener('click', async () => {
        const answers = manualInput.value.trim().toUpperCase();
        if (!answers) {
            showToast('Digite as respostas', true);
            return;
        }

        const cfg = await configManager.getConfig();
        if (!cfg || !cfg.correctAnswers) {
            showToast('Configure o gabarito primeiro!', true);
            return;
        }

        const result = gradeChecker.checkAnswers(answers, cfg);
        displayResults(result);
    });

    manualInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const answers = manualInput.value.trim().toUpperCase();
            const cfg = await configManager.getConfig();
            if (cfg && cfg.correctAnswers) {
                const result = gradeChecker.checkAnswers(answers, cfg);
                displayResults(result);
            }
        }
    });
});