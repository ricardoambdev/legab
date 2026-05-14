class GabaritoOCR {
    constructor() {
        this.worker = null;
        this.ready = false;
    }

    async init() {
        if (this.ready) return;

        try {
            this.worker = await Tesseract.createWorker('por');
            this.ready = true;
        } catch (error) {
            console.error('Erro ao inicializar Tesseract:', error);
            throw new Error('Falha ao inicializar OCR. Verifique sua conexão com a internet.');
        }
    }

    async processImage(imageSource) {
        await this.init();

        try {
            const result = await this.worker.recognize(imageSource);
            return result.data.text;
        } catch (error) {
            console.error('Erro no reconhecimento:', error);
            throw new Error('Falha ao processar imagem.');
        }
    }

    parseGabarito(text, numQuestions, numAlternatives) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            return '';
        }

        const answers = new Array(numQuestions).fill(null);
        const options = 'ABCDE'.substring(0, numAlternatives);

        console.log('Texto OCR detectado:', text.substring(0, 200));

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
                        }
                    }
                }
            }

            const parts = cleanLine.split(/\s+/).filter(p => p.length > 0);
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const numMatch = part.match(/^(\d+)$/);
                if (numMatch) {
                    const questionNum = parseInt(numMatch[1]);
                    if (questionNum >= 1 && questionNum <= numQuestions) {
                        for (let j = i + 1; j < parts.length && j <= i + numAlternatives; j++) {
                            const candidate = parts[j].replace(/[^\w]/g, '').toUpperCase();
                            if (options.includes(candidate) && candidate.length === 1) {
                                answers[questionNum - 1] = candidate;
                                break;
                            }
                        }
                    }
                }
            }
        }

        const detectedCount = answers.filter(a => a !== null).length;
        console.log(`Detectadas ${detectedCount} de ${numQuestions} respostas`);

        return answers.map(a => a || '').join('');
    }
}

class Scanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.scanning = false;
    }

    async start(onError) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video = document.getElementById('video');
            this.canvas = document.getElementById('canvas');
            this.video.srcObject = this.stream;
            await this.video.play();

            document.getElementById('btn-start').classList.add('hidden');
            document.getElementById('btn-capture').classList.remove('hidden');
            document.getElementById('btn-stop').classList.remove('hidden');
            document.getElementById('overlay').style.display = 'flex';

            this.scanning = true;
            return true;
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            if (onError) onError(error);
            return false;
        }
    }

    async captureAndProcess(config) {
        if (!this.video || !this.canvas) {
            throw new Error('Câmera não iniciada');
        }

        const ctx = this.canvas.getContext('2d');
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;

        if (width === 0 || height === 0) {
            throw new Error('Não foi possível capturar a imagem. Tente novamente.');
        }

        this.canvas.width = width;
        this.canvas.height = height;
        ctx.drawImage(this.video, 0, 0);

        const imageData = this.canvas.toDataURL('image/png');

        const ocr = new GabaritoOCR();

        updateLoadingStatus('Iniciando OCR...');
        const text = await ocr.processImage(imageData);

        updateLoadingStatus('Analisando respostas...');

        const numQuestions = config.numQuestions || 60;
        const numAlternatives = config.numAlternatives || 5;

        const detectedAnswers = ocr.parseGabarito(text, numQuestions, numAlternatives);

        return detectedAnswers;
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }

        this.scanning = false;

        document.getElementById('btn-start').classList.remove('hidden');
        document.getElementById('btn-capture').classList.add('hidden');
        document.getElementById('btn-stop').classList.add('hidden');
        document.getElementById('overlay').style.display = 'none';
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

document.addEventListener('DOMContentLoaded', async () => {
    scanner = new Scanner();
    gradeChecker = new GradeChecker();
    configManager = new ConfigManager();

    configManager.onReady(() => {
        console.log('ConfigManager pronto');
    });

    const config = await configManager.getConfig();
    if (config) {
        document.getElementById('config-questions').textContent = config.numQuestions || '60';
        document.getElementById('config-alternatives').textContent = config.numAlternatives || 5;
    } else {
        document.getElementById('config-questions').textContent = '60';
        document.getElementById('config-alternatives').textContent = 5;
    }

    const btnStart = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnCheckManual = document.getElementById('btn-check-manual');
    const manualInput = document.getElementById('manual-answers');

    btnStart.addEventListener('click', async () => {
        showToast('Iniciando câmera...');
        const success = await scanner.start(
            (error) => showToast('Erro na câmera: ' + error.message, true)
        );
        if (!success) {
            showToast('Não foi possível iniciar a câmera', true);
        }
    });

    btnCapture.addEventListener('click', async () => {
        try {
            const cfg = await configManager.getConfig();

            if (!cfg) {
                showToast('Configuração não encontrada. Configure o gabarito primeiro.', true);
                return;
            }

            if (!cfg.correctAnswers) {
                showToast('Gabarito não configurado. Configure as respostas corretas.', true);
                return;
            }

            showLoading(true);
            updateLoadingStatus('Capturando imagem...');

            const detectedAnswers = await scanner.captureAndProcess(cfg);

            showToast(`Detectado: ${detectedAnswers || 'nenhuma resposta'}`);

            if (!detectedAnswers || detectedAnswers.length === 0) {
                showToast('Não foi possível detectar as respostas. Tente novamente.', true);
                showLoading(false);
                return;
            }

            updateLoadingStatus('Verificando...');
            const result = gradeChecker.checkAnswers(detectedAnswers, cfg);
            displayResults(result);
            showLoading(false);

        } catch (error) {
            console.error('Erro completo:', error);
            showToast('Erro: ' + (error.message || 'Algo deu errado'), true);
            showLoading(false);
        }
    });

    btnStop.addEventListener('click', () => {
        scanner.stop();
    });

    btnCheckManual.addEventListener('click', async () => {
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

function displayResults(result) {
    document.getElementById('correct-count').textContent = result.correct;
    document.getElementById('wrong-count').textContent = result.wrong;
    document.getElementById('blank-count').textContent = result.blank;
    document.getElementById('total-questions').textContent = result.total;
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

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    }
}

window.Scanner = Scanner;
window.GradeChecker = GradeChecker;
window.GabaritoOCR = GabaritoOCR;