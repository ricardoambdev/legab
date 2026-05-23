/**
 * LeGab OMR - Aplicação Principal
 * Sistema de leitura de gabaritos com OpenCV.js
 */

// Variáveis globais
let camera = null;
let ui = null;
let omr = null;
let isProcessing = false;
let cvReady = false;
let scanInterval = null;

/**
 * Callback quando OpenCV carrega
 */
function onOpenCVReady() {
    cvReady = true;
    console.log('✅ OpenCV.js carregado');
    initApp();
}

/**
 * Inicializa o aplicativo
 */
function initApp() {
    console.log('🚀 Iniciando LeGab OMR...');
    
    // Inicializa UI
    ui = new UIModule({
        videoElement: document.getElementById('video'),
        statusElement: document.getElementById('camera-status'),
        logElement: document.getElementById('log')
    });
    
    // Carrega configurações
    const config = loadConfig();
    
    // Inicializa OMR
    omr = new OMRModule({
        numQuestions: config.numQuestions || 60,
        alternativesPerQuestion: config.numAlternatives || 5,
        columns: 2,
        fillThreshold: 0.35,
        minMarkCoverage: 0.25,
        debug: false
    });
    
    // Inicializa câmera
    camera = new CameraModule({
        onFrame: null // Processamento manual
    });
    
    startCamera();
}

/**
 * Inicia a câmera
 */
async function startCamera() {
    const video = document.getElementById('video');
    
    try {
        log('Verificando permissões...');
        ui.setStatus('📷 Solicitando câmera...', 'info');
        
        await camera.start(video, {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        const width = video.videoWidth || video.clientWidth;
        const height = video.videoHeight || video.clientHeight;
        
        log(`Câmera: ${width}x${height}`);
        ui.setStatus('✅ Câmera ativa', 'success');
        
        // Ajusta overlay canvas
        adjustOverlayCanvas();
        
        // Adiciona controles
        setupControls();
        
        // Inicia animação do scanner
        startScanAnimation();
        
    } catch (error) {
        console.error('Erro na câmera:', error);
        let errorMsg = error.message;
        
        if (error.name === 'NotAllowedError') {
            errorMsg = 'Permissão negada! Permita acesso à câmera.';
        } else if (error.name === 'NotFoundError') {
            errorMsg = 'Câmera não encontrada.';
        } else if (error.name === 'NotReadableError') {
            errorMsg = 'Câmera ocupada.';
        } else if (window.location.protocol === 'http:') {
            errorMsg = 'Use HTTPS ou localhost.';
        }
        
        ui.setStatus('❌ ' + errorMsg, 'error');
        log('Erro: ' + errorMsg);
    }
}

/**
 * Ajusta o canvas de overlay
 */
function adjustOverlayCanvas() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay-canvas');
    
    if (video && canvas) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
    }
}

/**
 * Configura botões da interface
 */
function setupControls() {
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    const btnTest = document.getElementById('btn-test');
    
    // Botão de captura já visível
    if (btnCapture) {
        btnCapture.onclick = captureAndProcess;
    }
    
    if (btnStop) {
        btnStop.onclick = stopCamera;
    }
    
    if (btnRestart) {
        btnRestart.onclick = restartCamera;
    }
    
    if (btnTest) {
        btnTest.onclick = () => {
            stopCamera();
            setTimeout(() => startCamera(), 500);
        };
    }
}

/**
 * Para a câmera
 */
function stopCamera() {
    if (camera) {
        camera.stop();
        ui.setStatus('Câmera parada', 'info');
        log('Câmera parada');
    }
    
    stopScanAnimation();
    
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    
    if (btnCapture) btnCapture.classList.add('hidden');
    if (btnStop) btnStop.classList.remove('hidden');
    if (btnRestart) btnRestart.classList.remove('hidden');
}

/**
 * Reinicia a câmera
 */
function restartCamera() {
    stopCamera();
    setTimeout(() => {
        startCamera();
    }, 500);
}

/**
 * Inicia animação do scanner
 */
function startScanAnimation() {
    const scanLine = document.getElementById('scan-line');
    if (scanLine) {
        scanLine.classList.add('scanning');
    }
}

/**
 * Para animação do scanner
 */
function stopScanAnimation() {
    const scanLine = document.getElementById('scan-line');
    if (scanLine) {
        scanLine.classList.remove('scanning');
    }
}

/**
 * Captura e processa imagem
 */
async function captureAndProcess() {
    if (isProcessing || !camera || !cvReady) return;
    
    isProcessing = true;
    showLoading(true, '📸 Capturando...');
    
    try {
        // Pequeno delay para garantir estabilização
        await sleep(100);
        
        log('Capturando imagem...');
        showLoading(true, '📸 Capturando...');
        
        // Captura imagem da câmera
        const srcMat = camera.captureToMat();
        
        if (srcMat.empty()) {
            throw new Error('Imagem vazia capturada');
        }
        
        log(`Imagem: ${srcMat.cols}x${srcMat.rows}`);
        showLoading(true, '🔍 Processando...');
        
        // 1. Pré-processamento
        log('Pré-processando...');
        const processed = PreprocessingModule.processForOMR(srcMat, {
            blurSize: 5,
            blockSize: 11,
            constant: 2
        });
        
        // 2. Detecta documento
        log('Detectando documento...');
        const correction = PerspectiveModule.autoCorrect(srcMat, {
            minArea: 5000,
            maxArea: srcMat.cols * srcMat.rows * 0.95,
            width: 600,
            height: 800
        });
        
        let processMat = srcMat;
        if (correction.success && correction.corrected) {
            log('Perspectiva corrigida ✓');
            processMat = correction.corrected;
        } else {
            log('Usando imagem original');
        }
        
        // 3. Processa OMR
        log('Lendo gabarito...');
        showLoading(true, '📖 Lendo respostas...');
        
        const results = omr.processImage(processed.threshold);
        const answers = omr.extractAnswers(results);
        
        log(`Questões: ${answers.length}`);
        
        // 4. Carrega gabarito
        const config = loadConfig();
        const correctAnswers = config.correctAnswers ? 
            config.correctAnswers.toUpperCase().split('') : null;
        
        if (!correctAnswers || correctAnswers.length === 0) {
            log('⚠️ Gabarito não configurado!');
            showLoading(false);
            alert('Configure o gabarito em Config primeiro!');
        } else {
            // 5. Compara respostas
            const comparison = omr.compareWithKey(answers, correctAnswers);
            
            log(`Acertos: ${comparison.correct}/${comparison.total} (${comparison.percentage}%)`);
            
            // 6. Mostra resultados
            ui.showResults(results, correctAnswers.join(''));
            
            ui.setStatus('✅ Concluído!', 'success');
            showLoading(false);
        }
        
        // Limpeza de memória
        cleanupMats([srcMat, processed.gray, processed.blurred, 
                    processed.threshold, processed.edges, correction.corrected]);
        
    } catch (error) {
        console.error('Erro no processamento:', error);
        ui.setStatus('❌ Erro: ' + error.message, 'error');
        log('Erro: ' + error.message);
        showLoading(false);
        alert('Erro: ' + error.message);
    } finally {
        isProcessing = false;
        startScanAnimation();
    }
}

/**
 * Limpeza de matrizes OpenCV
 */
function cleanupMats(mats) {
    for (const mat of mats) {
        if (mat && typeof mat.delete === 'function') {
            try {
                mat.delete();
            } catch (e) {}
        }
    }
}

/**
 * Carrega configurações
 */
function loadConfig() {
    try {
        const stored = localStorage.getItem('legab_config');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return { numQuestions: 60, numAlternatives: 5, correctAnswers: '' };
}

/**
 * Função de log
 */
function log(message) {
    const logEl = document.getElementById('log');
    if (logEl) {
        logEl.textContent = message;
    }
    console.log('[LeGab]', message);
}

/**
 * Show/hide loading overlay
 */
function showLoading(show, text = '') {
    const overlay = document.getElementById('loading-overlay');
    const textEl = document.getElementById('loading-text');
    
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
            if (textEl && text) textEl.textContent = text;
        } else {
            overlay.classList.add('hidden');
        }
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Inicializa quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado');
    if (!cvReady) {
        log('Aguardando OpenCV...');
    }
});

// Exporta funções globais
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.captureAndProcess = captureAndProcess;
window.initApp = initApp;
