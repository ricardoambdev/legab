let config = null;
let stream = null;
let isAutoDetect = true;
let lastCaptureTime = 0;

document.addEventListener('DOMContentLoaded', async () => {
    config = await loadConfig();
    
    const numQuestions = config?.numQuestions || 6;
    const numAlternatives = config?.numAlternatives || 5;
    
    document.getElementById('config-questions').textContent = numQuestions;
    document.getElementById('config-alternatives').textContent = numAlternatives;

    const video = document.getElementById('video');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnRetry = document.getElementById('btn-retry');
    const btnProcess = document.getElementById('btn-process');
    const btnCheck = document.getElementById('btn-check');
    const autoDetectToggle = document.getElementById('auto-detect');
    const previewSection = document.getElementById('preview-section');
    const imagePreview = document.getElementById('image-preview');
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');
    const manualInput = document.getElementById('manual-answers');

    let currentImage = null;
    let captureInterval = null;

    // Auto detect toggle
    autoDetectToggle.addEventListener('change', (e) => {
        isAutoDetect = e.target.checked;
    });

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
            btnCapture.classList.add('hidden');
            btnStop.classList.remove('hidden');
            
            // Auto capture loop
            if (isAutoDetect) {
                captureInterval = setInterval(async () => {
                    const now = Date.now();
                    if (now - lastCaptureTime > 2000) {
                        await captureAndProcess();
                    }
                }, 500);
            }
        } catch (error) {
            showToast('Erro na câmera: ' + error.message, true);
        }
    }

    // Capture button
    btnCapture.addEventListener('click', async () => {
        await captureAndProcess();
    });

    // Stop button
    btnStop.addEventListener('click', () => {
        stopCamera();
    });

    // Retry
    btnRetry.addEventListener('click', () => {
        hidePreview();
        startCamera();
    });

    // Process button
    btnProcess.addEventListener('click', async () => {
        if (!currentImage) return;
        
        showLoading(true);
        updateLoadingStatus('Processando...');
        
        try {
            const answers = await processImage(currentImage, config);
            const result = checkAnswers(answers, config);
            showResult(result);
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, true);
        } finally {
            showLoading(false);
        }
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

    async function captureAndProcess() {
        if (!stream) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        currentImage = canvas.toDataURL('image/jpeg', 0.8);
        
        showPreview(currentImage);
        stopCamera();
        
        // Auto process
        showLoading(true);
        updateLoadingStatus('Analisando...');
        
        try {
            const answers = await processImage(currentImage, config);
            const result = checkAnswers(answers, config);
            showResult(result);
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, true);
            showLoading(false);
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (captureInterval) {
            clearInterval(captureInterval);
            captureInterval = null;
        }
        btnCapture.classList.remove('hidden');
        btnStop.classList.add('hidden');
    }

    function showPreview(imageSrc) {
        imagePreview.src = imageSrc;
        previewSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
    }

    function hidePreview() {
        previewSection.classList.add('hidden');
        currentImage = null;
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
        const numQ = cfg.numQuestions || 6;
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
        return { numQuestions: 6, numAlternatives: 5 };
    }

    function showToast(msg, isError) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `md-toast show ${isError ? 'error' : 'success'}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});