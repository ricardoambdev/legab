let config = null;
let stream = null;
let detectionInterval = null;
let capturedImage = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', async () => {
    config = await loadConfig();
    
    const numQuestions = config?.numQuestions || 60;
    const numAlternatives = config?.numAlternatives || 5;
    
    document.getElementById('config-questions').textContent = numQuestions;
    document.getElementById('config-alternatives').textContent = numAlternatives;

    const video = document.getElementById('video');
    const btnProcess = document.getElementById('btn-process');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    const btnCheck = document.getElementById('btn-check');
    const processSection = document.getElementById('process-section');
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');
    const manualInput = document.getElementById('manual-answers');
    const scanStatus = document.getElementById('scan-status');

    let detectionCount = 0;
    const detectionThreshold = 3; // Detecta após 3 verificações consecutivas

    // Start camera
    startCamera();

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            video.srcObject = stream;
            processSection.classList.add('hidden');
            btnStop.classList.remove('hidden');
            btnRestart.classList.add('hidden');
            
            // Start detection loop
            detectionCount = 0;
            updateScanStatus('searching', 'Procurando gabarito...');
            
            detectionInterval = setInterval(async () => {
                if (isProcessing) return;
                
                const detected = await detectGabarito(video);
                
                if (detected) {
                    detectionCount++;
                    updateScanStatus('detecting', `Gabarito detectado! (${detectionCount}/${detectionThreshold})`);
                    
                    if (detectionCount >= detectionThreshold) {
                        // Captura a imagem atual
                        capturedImage = captureFrame(video);
                        showProcessButton();
                        stopDetection();
                    }
                } else {
                    detectionCount = 0;
                    updateScanStatus('searching', 'Procurando gabarito...');
                }
            }, 800); // Verifica a cada 800ms
            
        } catch (error) {
            showToast('Erro na câmera: ' + error.message, true);
        }
    }

    async function detectGabarito(video) {
        // Tenta detectar se há um gabarito visível
        // Usa análise simples de contraste e padrões
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Analisa contraste médio (gabaritos têm alto contraste)
        let contrast = 0;
        const sampleStep = 10;
        let samples = 0;
        
        for (let i = 0; i < data.length; i += 4 * sampleStep) {
            if (i + 4 * sampleStep < data.length) {
                const diff = Math.abs(data[i] - data[i + 4 * sampleStep]);
                contrast += diff;
                samples++;
            }
        }
        
        const avgContrast = samples > 0 ? contrast / samples : 0;
        
        // Gabaritos têm alto contraste (preto no branco)
        return avgContrast > 30; // Threshold ajustável
    }

    function updateScanStatus(status, text) {
        const icon = scanStatus.querySelector('.status-icon');
        const textEl = scanStatus.querySelector('.status-text');
        
        if (status === 'searching') {
            icon.textContent = 'searching';
            icon.className = 'status-icon material-icons';
        } else if (status === 'detecting') {
            icon.textContent = 'visibility';
            icon.className = 'status-icon material-icons success';
        }
        
        textEl.textContent = text;
    }

    function showProcessButton() {
        processSection.classList.remove('hidden');
    }

    function stopDetection() {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
    }

    function captureFrame(video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.9);
    }

    // Process button
    btnProcess.addEventListener('click', async () => {
        if (!capturedImage || isProcessing) return;
        
        isProcessing = true;
        processSection.classList.add('hidden');
        showLoading(true);
        updateLoadingStatus('Processando gabarito...');
        
        try {
            const answers = await processImage(capturedImage, config);
            const result = checkAnswers(answers, config);
            showResult(result);
            stopCamera();
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, true);
            processSection.classList.remove('hidden');
        } finally {
            isProcessing = false;
            showLoading(false);
        }
    });

    // Stop button
    btnStop.addEventListener('click', () => {
        stopCamera();
        processSection.classList.add('hidden');
    });

    // Restart button
    btnRestart.addEventListener('click', () => {
        capturedImage = null;
        processSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        startCamera();
    });

    // Check manual
    btnCheck.addEventListener('click', () => {
        const answers = manualInput.value.trim().toUpperCase();
        if (!answers) {
            showToast('Digite as respostas', true);
            return;
        }
        const result = checkAnswers(answers, config);
        showResult(result);
    });

    manualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnCheck.click();
        }
    });

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        stopDetection();
        btnStop.classList.add('hidden');
        btnRestart.classList.remove('hidden');
    }

    function showLoading(show) {
        loadingSection.classList.toggle('hidden', !show);
        if (show) {
            resultSection.classList.add('hidden');
        }
    }

    function updateLoadingStatus(text) {
        document.getElementById('loading-status').textContent = text;
    }

    async function processImage(imageSrc, cfg) {
        const worker = await Tesseract.createWorker('por');
        const { data: { text } } = await worker.recognize(imageSrc);
        await worker.terminate();
        return parseAnswers(text, cfg);
    }

    function parseAnswers(text, cfg) {
        const numQ = cfg.numQuestions || 60;
        const numA = cfg.numAlternatives || 5;
        const options = 'ABCDE'.substring(0, numA);
        const answers = new Array(numQ).fill('');
        const lines = text.split('\n');
        
        for (const line of lines) {
            const clean = line.toUpperCase().replace(/[^A-E0-9\s]/g, ' ');
            const parts = clean.split(/\s+/).filter(p => p.length > 0);
            
            for (let i = 0; i < parts.length; i++) {
                const numMatch = parts[i].match(/^(\d+)$/);
                if (numMatch) {
                    const qNum = parseInt(numMatch[1]);
                    if (qNum >= 1 && qNum <= numQ) {
                        for (let j = i + 1; j < parts.length; j++) {
                            const candidate = parts[j].replace(/[^\w]/g, '');
                            if (options.includes(candidate) && candidate.length === 1) {
                                answers[qNum - 1] = candidate;
                                break;
                            }
                        }
                    }
                }
            }
            
            const pairs = clean.match(/(\d+)\s+([A-E])/gi);
            if (pairs) {
                pairs.forEach(pair => {
                    const match = pair.match(/(\d+)\s+([A-E])/i);
                    if (match) {
                        const q = parseInt(match[1]);
                        const a = match[2].toUpperCase();
                        if (q >= 1 && q <= numQ && options.includes(a)) {
                            answers[q - 1] = a;
                        }
                    }
                });
            }
        }
        
        return answers.join('');
    }

    function checkAnswers(userAnswers, cfg) {
        const correct = (cfg.correctAnswers || '').toUpperCase();
        const answers = (userAnswers || '').toUpperCase();
        
        let correctCount = 0;
        let wrongCount = 0;
        let blankCount = 0;
        
        for (let i = 0; i < correct.length; i++) {
            const userChar = answers[i] || '';
            
            if (!userChar || userChar === '') {
                blankCount++;
                wrongCount++;
            } else if (correct[i] === userChar) {
                correctCount++;
            } else {
                wrongCount++;
            }
        }
        
        const total = correct.length;
        const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        
        return {
            correct: correctCount,
            wrong: wrongCount,
            blank: blankCount,
            total,
            percentage,
            passingScore: cfg.passingScore || 60,
            passed: percentage >= (cfg.passingScore || 60)
        };
    }

    function showResult(result) {
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
        
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    async function loadConfig() {
        try {
            const stored = localStorage.getItem('legab_config');
            if (stored) return JSON.parse(stored);
        } catch(e) {}
        return { numQuestions: 60, numAlternatives: 5 };
    }

    function showToast(msg, isError) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `md-toast show ${isError ? 'error' : 'success'}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});