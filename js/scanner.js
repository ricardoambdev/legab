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
            throw error;
        }
    }

    async processImage(imageSource) {
        await this.init();

        const result = await this.worker.recognize(imageSource);
        return result.data.text;
    }

    parseGabarito(text, numQuestions, numAlternatives) {
        const lines = text.split('\n');
        const answers = [];
        const options = 'ABCDE'.substring(0, numAlternatives);

        for (const line of lines) {
            const cleanLine = line.toUpperCase().replace(/[^A-E0-9\s]/g, '');

            const numberMatch = cleanLine.match(/(\d+)[\s]+([A-E])/i);
            if (numberMatch) {
                const questionNum = parseInt(numberMatch[1]);
                const answer = numberMatch[2].toUpperCase();
                if (options.includes(answer)) {
                    answers[questionNum - 1] = answer;
                }
            }

            const spacedMatch = cleanLine.match(/^\s*(\d+)[\s]+([A-E\s]+)$/i);
            if (spacedMatch) {
                const questionNum = parseInt(spacedMatch[1]);
                const answersPart = spacedMatch[2].trim().split(/\s+/);
                for (let i = 0; i < answersPart.length && answers.length < numQuestions; i++) {
                    const ans = answersPart[i].toUpperCase();
                    if (options.includes(ans)) {
                        if (!answers[questionNum - 1]) {
                            answers[questionNum - 1] = ans;
                        }
                    }
                }
            }
        }

        return answers.filter(a => a !== undefined).join('');
    }
}

class Scanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.scanning = false;
        this.onResult = null;
        this.onError = null;
    }

    async start(onResult, onError) {
        this.onResult = onResult;
        this.onError = onError;

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

        this.canvas.width = width;
        this.canvas.height = height;
        ctx.drawImage(this.video, 0, 0);

        const imageData = this.canvas.toDataURL('image/png');

        const ocr = new GabaritoOCR();
        await ocr.init();

        const text = await ocr.processImage(imageData);
        const detectedAnswers = ocr.parseGabarito(text, config.numQuestions, config.numAlternatives);

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
    async checkAnswers(userAnswers, config) {
        const correctAnswers = config.correctAnswers.toUpperCase();
        const answers = userAnswers.toUpperCase();

        let correct = 0;
        let wrong = 0;

        const maxLen = Math.max(correctAnswers.length, answers.length);

        for (let i = 0; i < maxLen; i++) {
            const correctChar = correctAnswers[i] || '-';
            const userChar = answers[i] || '-';

            if (i < correctAnswers.length && i < answers.length) {
                if (correctChar === userChar) {
                    correct++;
                } else {
                    wrong++;
                }
            }
        }

        const total = correct + wrong;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        return {
            correct,
            wrong,
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

    const config = await configManager.getConfig();
    if (config) {
        document.getElementById('config-questions').textContent = config.numQuestions || '-';
        document.getElementById('config-alternatives').textContent = config.numAlternatives || 5;
    } else {
        document.getElementById('config-questions').textContent = '20';
        document.getElementById('config-alternatives').textContent = '5';
    }

    const btnStart = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnCheckManual = document.getElementById('btn-check-manual');
    const manualInput = document.getElementById('manual-answers');

    btnStart.addEventListener('click', async () => {
        showToast('Iniciando câmera...');
        await scanner.start(
            null,
            (error) => showToast('Erro: ' + error.message, true)
        );
    });

    btnCapture.addEventListener('click', async () => {
        const cfg = await configManager.getConfig();
        if (!cfg || !cfg.correctAnswers) {
            showToast('Configure o gabarito primeiro!', true);
            return;
        }

        showLoading(true);
        updateLoadingStatus('Capturando imagem...');

        try {
            updateLoadingStatus('Processando OCR...');
            const detectedAnswers = await scanner.captureAndProcess(cfg);

            if (!detectedAnswers || detectedAnswers.length === 0) {
                showToast('Não foi possível detectar as respostas', true);
                showLoading(false);
                return;
            }

            showToast(`Detectado: ${detectedAnswers}`);

            updateLoadingStatus('Verificando...');
            const result = await gradeChecker.checkAnswers(detectedAnswers, cfg);
            displayResults(result);
        } catch (error) {
            console.error('Erro no processamento:', error);
            showToast('Erro: ' + error.message, true);
        } finally {
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

        const result = await gradeChecker.checkAnswers(answers, cfg);
        displayResults(result);
    });

    manualInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const answers = manualInput.value.trim().toUpperCase();
            const cfg = await configManager.getConfig();
            if (cfg && cfg.correctAnswers) {
                const result = await gradeChecker.checkAnswers(answers, cfg);
                displayResults(result);
            }
        }
    });
});

function displayResults(result) {
    document.getElementById('correct-count').textContent = result.correct;
    document.getElementById('wrong-count').textContent = result.wrong;
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
    document.getElementById('result-section').classList.add('hidden');
}

function updateLoadingStatus(text) {
    document.getElementById('loading-status').textContent = text;
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

window.Scanner = Scanner;
window.GradeChecker = GradeChecker;
window.GabaritoOCR = GabaritoOCR;