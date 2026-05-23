let config = null;
let currentImage = null;

document.addEventListener('DOMContentLoaded', async () => {
    const configManager = new ConfigManager();
    
    // Carregar configurações
    config = await configManager.getConfig();
    
    const numQuestions = config?.numQuestions || 6;
    const numAlternatives = config?.numAlternatives || 5;
    
    document.getElementById('config-questions').textContent = numQuestions;
    document.getElementById('config-alternatives').textContent = numAlternatives;

    const btnUpload = document.getElementById('btn-upload');
    const btnCamera = document.getElementById('btn-camera');
    const btnRetry = document.getElementById('btn-retry');
    const btnProcess = document.getElementById('btn-process');
    const btnCheck = document.getElementById('btn-check');
    const fileInput = document.getElementById('file-input');
    const previewSection = document.getElementById('preview-section');
    const imagePreview = document.getElementById('image-preview');
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');
    const manualInput = document.getElementById('manual-answers');

    // Upload button
    btnUpload.addEventListener('click', () => {
        fileInput.click();
    });

    // Camera button
    btnCamera.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            const track = stream.getTracks()[0];
            const imageCapture = new ImageCapture(track);
            const blob = await imageCapture.takePhoto();
            
            track.stop();
            
            const reader = new FileReader();
            reader.onload = (e) => {
                showPreview(e.target.result);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            showToast('Não foi possível usar a câmera', true);
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                showPreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // Retry
    btnRetry.addEventListener('click', () => {
        hidePreview();
        fileInput.value = '';
    });

    // Process image
    btnProcess.addEventListener('click', async () => {
        if (!currentImage) return;
        
        showLoading(true);
        updateLoadingStatus('Processando imagem...');
        
        try {
            const answers = await processImage(currentImage, config);
            const result = checkAnswers(answers, config);
            showResult(result);
        } catch (error) {
            console.error(error);
            showToast('Erro ao processar: ' + error.message, true);
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

    function showPreview(imageSrc) {
        currentImage = imageSrc;
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
        updateLoadingStatus('Iniciando OCR...');
        
        // Create worker
        const worker = await Tesseract.createWorker('por');
        
        updateLoadingStatus('Reconhecendo...');
        const { data: { text } } = await worker.recognize(imageSrc);
        await worker.terminate();
        
        updateLoadingStatus('Analisando...');
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

    function showToast(msg, isError) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `md-toast show ${isError ? 'error' : 'success'}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});