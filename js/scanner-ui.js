let stream = null;
let videoElement = null;
let isProcessing = false;

async function startCamera() {
    const statusEl = document.getElementById('camera-status');
    
    try {
        if (statusEl) statusEl.textContent = 'Verificando suporte...';
        
        if (!navigator.mediaDevices) {
            throw new Error('navigator.mediaDevices não disponível. Use HTTPS ou localhost.');
        }
        
        if (statusEl) statusEl.textContent = 'Solicitando permissão...';
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        stream = mediaStream;
        videoElement = document.getElementById('video');
        
        if (!videoElement) {
            throw new Error('Elemento não encontrado');
        }
        
        videoElement.srcObject = stream;
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            
            videoElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            videoElement.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Erro no vídeo'));
            };
        });
        
        await videoElement.play();
        
        console.log('✅ Câmera ativa:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        if (statusEl) statusEl.textContent = `✅ Câmera: ${videoElement.videoWidth}x${videoElement.videoHeight}`;
        
        const btnStop = document.getElementById('btn-stop');
        const btnRestart = document.getElementById('btn-restart');
        const btnCapture = document.getElementById('btn-capture');
        
        if (btnStop) {
            btnStop.classList.remove('hidden');
            btnStop.onclick = () => {
                stopCamera();
                btnStop.classList.add('hidden');
                if (btnRestart) btnRestart.classList.remove('hidden');
                if (btnCapture) btnCapture.classList.add('hidden');
                if (statusEl) statusEl.textContent = 'Câmera parada';
            };
        }
        
        if (btnCapture) {
            btnCapture.classList.remove('hidden');
            btnCapture.onclick = () => captureAndProcess();
        }
        
        if (btnRestart) {
            btnRestart.onclick = () => {
                stopCamera();
                startCamera();
            };
        }
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
        if (statusEl) statusEl.textContent = '❌ Erro: ' + error.message;
        alert('Erro: ' + error.message);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
        videoElement = null;
    }
}

async function captureAndProcess() {
    if (isProcessing || !videoElement) return;
    
    isProcessing = true;
    const statusEl = document.getElementById('camera-status');
    
    try {
        if (statusEl) statusEl.textContent = '📸 Capturando...';
        
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        console.log('📸 Imagem capturada:', canvas.width, 'x', canvas.height);
        
        // Processa OCR automaticamente
        processOCR(imageData);
        
    } catch (error) {
        console.error('Erro:', error);
        if (statusEl) statusEl.textContent = '❌ Erro: ' + error.message;
        isProcessing = false;
    }
}

async function processOCR(imageData) {
    const statusEl = document.getElementById('camera-status');
    
    try {
        console.log('🔍 Iniciando OCR...');
        if (statusEl) statusEl.textContent = '🔍 Carregando OCR...';
        
        const worker = await Tesseract.createWorker('eng');
        
        console.log('📖 Lendo texto...');
        if (statusEl) statusEl.textContent = '📖 Lendo gabarito...';
        
        const { data: { text } } = await worker.recognize(imageData);
        
        await worker.terminate();
        
        console.log('📝 Texto OCR:', text);
        console.log('✅ OCR finalizado!');
        
        if (statusEl) statusEl.textContent = '✅ Texto lido!';
        
        // Extrai respostas e já verifica
        extractAndCheck(text);
        
    } catch (error) {
        console.error('❌ Erro OCR:', error);
        if (statusEl) statusEl.textContent = '❌ Erro OCR: ' + error.message;
        alert('Erro no OCR: ' + error.message);
        isProcessing = false;
    }
}

function extractAndCheck(text) {
    console.log('🔍 Extraindo respostas do texto...');
    
    // Tenta extrair padrões como: 1A, 1.A, 1-A, 1 A, A1, etc.
    const lines = text.toUpperCase().split('\n');
    let answers = '';
    
    // Padrão 1: procura por números seguidos de letras (1A, 2B, 3C...)
    const pattern1 = /(\d+)[.\-\s]*([A-E])/g;
    let match;
    let found = false;
    
    while ((match = pattern1.exec(text)) !== null) {
        found = true;
        answers += match[2]; // pega a letra
    }
    
    // Padrão 2: se não achou, procura apenas letras isoladas
    if (!found || answers.length < 10) {
        answers = '';
        const letterPattern = /[A-E]/g;
        const letters = text.match(letterPattern);
        if (letters) {
            answers = letters.join('');
        }
    }
    
    console.log('Respostas extraídas:', answers);
    console.log('Tamanho:', answers.length);
    
    // Mostra modal com resultado
    showExtractionResult(answers, text);
}

function showExtractionResult(answers, fullText) {
    const modal = document.createElement('div');
    modal.id = 'extraction-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px">
            <div class="modal-header">
                <h2>Respostas Detectadas</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="md-field">
                    <label>Respostas (edite se necessário)</label>
                    <input type="text" id="extracted-answers" class="md-input" value="${answers}" placeholder="Ex: ABCDE...">
                </div>
                <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin:16px 0;max-height:150px;overflow-y:auto">
                    <small style="color:#666">Texto completo lido:</small>
                    <pre style="margin:4px 0 0;white-space:pre-wrap;font-size:11px;font-family:monospace">${fullText.substring(0, 500)}${fullText.length > 500 ? '...' : ''}</pre>
                </div>
                <button id="btn-confirm" class="md-btn md-btn-primary md-btn-block">
                    <span class="material-icons">check</span>
                    Verificar Respostas
                </button>
                <button id="btn-retry-ocr" class="md-btn md-btn-outline md-btn-block" style="margin-top:8px">
                    <span class="material-icons">refresh</span>
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-confirm').onclick = () => {
        const answersInput = document.getElementById('extracted-answers').value.toUpperCase().replace(/[^A-E]/g, '');
        checkAnswers(answersInput);
    };
    
    document.getElementById('btn-retry-ocr').onclick = () => {
        modal.remove();
        isProcessing = false;
        captureAndProcess();
    };
}

async function checkAnswers(answers) {
    const config = await loadConfig();
    const correct = (config.correctAnswers || '').toUpperCase();
    
    console.log('Gabarito correto:', correct);
    console.log('Respostas do aluno:', answers);
    
    if (!correct || correct.length === 0) {
        alert('⚠️ Gabarito não configurado! Vá em Config e defina as respostas corretas.');
        return;
    }
    
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    
    const total = correct.length;
    
    for (let i = 0; i < total; i++) {
        const userChar = (answers[i] || '').toUpperCase();
        const correctChar = correct[i];
        
        if (!userChar || userChar === '' || userChar === ' ') {
            blankCount++;
            wrongCount++;
        } else if (correctChar === userChar) {
            correctCount++;
        } else {
            wrongCount++;
        }
    }
    
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    
    // Fecha modal de extração
    const oldModal = document.getElementById('extraction-modal');
    if (oldModal) oldModal.remove();
    
    showFinalResult(correctCount, wrongCount, blankCount, total, percentage, answers, correct);
}

function showFinalResult(correct, wrong, blank, total, percentage, userAnswers, correctAnswers) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px">
            <div class="modal-header">
                <h2>Resultado</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="result-stats">
                    <div class="stat correct">
                        <span class="stat-value">${correct}</span>
                        <span class="stat-label">Acertos</span>
                    </div>
                    <div class="stat wrong">
                        <span class="stat-value">${wrong}</span>
                        <span class="stat-label">Erros</span>
                    </div>
                    <div class="stat blank">
                        <span class="stat-value">${blank}</span>
                        <span class="stat-label">Branco</span>
                    </div>
                </div>
                <div class="result-score">
                    <span class="score-value">${percentage}%</span>
                </div>
                <div id="pass-fail" class="pass-fail ${percentage >= 60 ? 'passed' : 'failed'}">
                    ${percentage >= 60 ? '🎉 Aprovado!' : '❌ Reprovado'}
                </div>
                <div style="margin-top:16px;font-size:12px;color:#666">
                    <div><strong>Correto:</strong> ${correctAnswers}</div>
                    <div><strong>Sua resposta:</strong> ${userAnswers}</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    isProcessing = false;
}

async function loadConfig() {
    try {
        const stored = localStorage.getItem('legab_config');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return { numQuestions: 60, numAlternatives: 5, correctAnswers: '' };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Scanner iniciado');
    console.log('🔗 Protocolo:', window.location.protocol);
    
    const statusEl = document.getElementById('camera-status');
    if (statusEl) statusEl.textContent = 'Iniciando...';
    
    setTimeout(() => startCamera(), 500);
});