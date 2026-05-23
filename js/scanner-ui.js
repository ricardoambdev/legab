let config = null;
let stream = null;
let detectionInterval = null;
let capturedImage = null;
let isProcessing = false;
let videoElement = null;

document.addEventListener('DOMContentLoaded', async () => {
    config = await loadConfig();
    
    const numQuestions = config?.numQuestions || 60;
    const numAlternatives = config?.numAlternatives || 5;
    
    document.getElementById('config-questions').textContent = numQuestions;
    document.getElementById('config-alternatives').textContent = numAlternatives;

    const btnProcess = document.getElementById('btn-process');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    const btnCheck = document.getElementById('btn-check');
    const btnSaveResult = document.getElementById('btn-save-result');
    const modalClose = document.getElementById('modal-close');
    const processButtonContainer = document.getElementById('process-button-container');
    const processSection = document.getElementById('process-section');
    const loadingSection = document.getElementById('loading-section');
    const resultModal = document.getElementById('result-modal');
    const manualInput = document.getElementById('manual-answers');
    const detectionStatus = document.getElementById('detection-status');

    let detectionCount = 0;
    const detectionThreshold = 3;
    let currentResult = null;

    // Set date
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR');
    document.getElementById('result-date').value = dateStr;

    // Start camera
    await startCamera();

    async function startCamera() {
        try {
            updateStatus('searching', 'Iniciando câmera...');
            
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
            
            videoElement = document.getElementById('video');
            videoElement.srcObject = stream;
            
            await new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.play().then(resolve).catch(resolve);
                };
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('Câmera iniciada:', videoElement.videoWidth, 'x', videoElement.videoHeight);
            
            processButtonContainer.classList.add('hidden');
            btnStop.classList.remove('hidden');
            btnRestart.classList.add('hidden');
            
            detectionCount = 0;
            updateStatus('searching', 'Procurando gabarito...');
            
            detectionInterval = setInterval(async () => {
                if (isProcessing || !videoElement || videoElement.readyState !== 4) return;
                
                const detected = await detectGabarito();
                
                if (detected) {
                    detectionCount++;
                    updateStatus('detecting', `Gabarito detectado! (${detectionCount}/${detectionThreshold})`);
                    
                    if (detectionCount >= detectionThreshold) {
                        capturedImage = captureFrame();
                        showProcessButton();
                        stopDetection();
                    }
                } else {
                    detectionCount = 0;
                    updateStatus('searching', 'Procurando gabarito...');
                }
            }, 1000);
            
        } catch (error) {
            console.error('Erro na câmera:', error);
            showToast('Erro: ' + error.message + '. Use HTTPS ou localhost.', true);
            updateStatus('error', 'Erro na câmera');
        }
    }

    async function detectGabarito() {
        if (!videoElement || videoElement.readyState !== 4) return false;
        if (videoElement.videoWidth === 0) return false;
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            ctx.drawImage(videoElement, 0, 0);
            
            const centerX = Math.floor(canvas.width / 2);
            const centerY = Math.floor(canvas.height / 2);
            const sampleWidth = Math.floor(canvas.width / 4);
            const sampleHeight = Math.floor(canvas.height / 4);
            
            const imageData = ctx.getImageData(
                centerX - sampleWidth / 2,
                centerY - sampleHeight / 2,
                sampleWidth,
                sampleHeight
            );
            
            const data = imageData.data;
            let brightPixels = 0;
            let darkPixels = 0;
            
            for (let i = 0; i < data.length; i += 16) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness > 200) brightPixels++;
                else if (brightness < 100) darkPixels++;
            }
            
            const total = brightPixels + darkPixels;
            if (total === 0) return false;
            
            const hasContrast = brightPixels > total * 0.3 && darkPixels > total * 0.05;
            const hasText = darkPixels > total * 0.05;
            
            return hasContrast && hasText;
        } catch (e) {
            console.error('Erro na detecção:', e);
            return false;
        }
    }

    function updateStatus(status, text) {
        if (!detectionStatus) return;
        
        const icon = detectionStatus.querySelector('.status-icon');
        const textEl = detectionStatus.querySelector('.status-text');
        
        if (!icon || !textEl) return;
        
        if (status === 'searching') {
            icon.textContent = 'searching';
            icon.className = 'status-icon material-icons';
        } else if (status === 'detecting') {
            icon.textContent = 'visibility';
            icon.className = 'status-icon material-icons success';
        } else if (status === 'error') {
            icon.textContent = 'error';
            icon.className = 'status-icon material-icons error';
        }
        
        textEl.textContent = text;
    }

    function showProcessButton() {
        processButtonContainer.classList.remove('hidden');
        showToast('Gabarito detectado! Clique em processar.', false);
    }

    function stopDetection() {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
    }

    function captureFrame() {
        if (!videoElement || videoElement.videoWidth === 0) {
            console.error('Vídeo não está pronto');
            return null;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log('Imagem capturada:', canvas.width, 'x', canvas.height, dataUrl.length, 'bytes');
        
        return dataUrl;
    }

    // Process button
    btnProcess.addEventListener('click', async () => {
        if (!capturedImage || isProcessing) return;
        
        isProcessing = true;
        processButtonContainer.classList.add('hidden');
        showLoading(true);
        updateLoadingStatus('Processando gabarito...');
        
        try {
            const answers = await processImage(capturedImage, config);
            currentResult = checkAnswers(answers, config);
            showResultModal(currentResult);
            stopCamera();
        } catch (error) {
            console.error(error);
            showToast('Erro: ' + error.message, true);
            processButtonContainer.classList.remove('hidden');
        } finally {
            isProcessing = false;
            showLoading(false);
        }
    });

    // Save result button
    btnSaveResult.addEventListener('click', () => {
        const studentName = document.getElementById('student-name').value.trim();
        if (!studentName) {
            showToast('Digite o nome do aluno', true);
            return;
        }
        
        // Save to localStorage
        const results = JSON.parse(localStorage.getItem('legab_results') || '[]');
        results.push({
            student: studentName,
            date: new Date().toISOString(),
            ...currentResult
        });
        localStorage.setItem('legab_results', JSON.stringify(results));
        
        showToast('Resultado salvo!', false);
        closeModal();
    });

    // Modal close
    modalClose.addEventListener('click', closeModal);
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) closeModal();
    });

    function closeModal() {
        resultModal.classList.add('hidden');
        currentResult = null;
    }

    function showResultModal(result) {
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
        
        document.getElementById('student-name').value = '';
        resultModal.classList.remove('hidden');
    }

    // Stop button
    btnStop.addEventListener('click', () => {
        stopCamera();
        processButtonContainer.classList.add('hidden');
    });

    // Restart button
    btnRestart.addEventListener('click', () => {
        capturedImage = null;
        processButtonContainer.classList.add('hidden');
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
        showResultModal(result);
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
    }

    function updateLoadingStatus(text) {
        const el = document.getElementById('loading-status');
        if (el) el.textContent = text;
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

    async function loadConfig() {
        try {
            const stored = localStorage.getItem('legab_config');
            if (stored) return JSON.parse(stored);
        } catch(e) {}
        return { numQuestions: 60, numAlternatives: 5 };
    }

    function showToast(msg, isError) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = `md-toast show ${isError ? 'error' : 'success'}`;
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
});