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
            throw new Error('Elemento <video> não encontrado');
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
        
        // Botões
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
        
        // Captura a imagem
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        console.log('📸 Imagem capturada:', canvas.width, 'x', canvas.height);
        
        // Mostra preview
        showPreview(imageData, canvas.width, canvas.height);
        
    } catch (error) {
        console.error('Erro:', error);
        if (statusEl) statusEl.textContent = '❌ Erro: ' + error.message;
        isProcessing = false;
    }
}

function showPreview(imageData, width, height) {
    // Cria modal de preview
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px">
            <div class="modal-header">
                <h2>Visualizar</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body">
                <img src="${imageData}" style="width:100%;border-radius:8px;margin-bottom:16px">
                <p style="color:#666;margin-bottom:16px">Resolução: ${width}x${height}</p>
                <button id="btn-process-now" class="md-btn md-btn-primary md-btn-block">
                    <span class="material-icons">text_recognition</span>
                    Processar com OCR
                </button>
                <button id="btn-retake" class="md-btn md-btn-outline md-btn-block" style="margin-top:8px">
                    <span class="material-icons">refresh</span>
                    Tentar Novamente
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-process-now').onclick = () => processOCR(imageData);
    document.getElementById('btn-retake').onclick = () => {
        modal.remove();
        isProcessing = false;
    };
}

async function processOCR(imageData) {
    const statusEl = document.getElementById('camera-status');
    
    try {
        if (statusEl) statusEl.textContent = '🔍 Carregando OCR...';
        
        // Carrega Tesseract
        const worker = await Tesseract.createWorker('por');
        
        if (statusEl) statusEl.textContent = '📖 Lendo texto...';
        
        const { data: { text } } = await worker.recognize(imageData);
        
        await worker.terminate();
        
        console.log('📝 Texto OCR:', text);
        
        if (statusEl) statusEl.textContent = '✅ Texto lido!';
        
        // Mostra resultado
        showOCRResult(text);
        
    } catch (error) {
        console.error('Erro OCR:', error);
        if (statusEl) statusEl.textContent = '❌ Erro OCR: ' + error.message;
        alert('Erro no OCR: ' + error.message);
    }
}

function showOCRResult(text) {
    const modal = document.createElement('div');
    modal.id = 'result-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px">
            <div class="modal-header">
                <h2>Resultado OCR</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body">
                <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin-bottom:16px;max-height:200px;overflow-y:auto">
                    <pre style="margin:0;white-space:pre-wrap;font-family:monospace;font-size:12px">${text || '(nenhum texto detectado)'}</pre>
                </div>
                <div class="md-field">
                    <label>Respostas Detectadas</label>
                    <input type="text" id="detected-answers" class="md-input" value="" placeholder="Cole aqui ou digite manualmente">
                </div>
                <button id="btn-check-manual" class="md-btn md-btn-primary md-btn-block">
                    <span class="material-icons">check</span>
                    Verificar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-check-manual').onclick = () => {
        const answers = document.getElementById('detected-answers').value.toUpperCase();
        checkAnswers(answers);
    };
}

async function checkAnswers(answers) {
    // Carrega config
    const config = await loadConfig();
    const correct = (config.correctAnswers || '').toUpperCase();
    
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    
    for (let i = 0; i < correct.length; i++) {
        const userChar = (answers[i] || '').toUpperCase();
        
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
    
    // Fecha modal anterior
    const oldModal = document.getElementById('result-modal');
    if (oldModal) oldModal.remove();
    
    // Mostra resultado final
    showFinalResult(correctCount, wrongCount, blankCount, total, percentage);
}

function showFinalResult(correct, wrong, blank, total, percentage) {
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
                    ${percentage >= 60 ? 'Aprovado!' : 'Reprovado'}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
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