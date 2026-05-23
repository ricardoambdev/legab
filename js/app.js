/**
 * LeGab OMR - Aplicação Principal
 * Integra todos os módulos do sistema OMR
 */

// Variáveis globais
let camera = null;
let ui = null;
let omr = null;
let isProcessing = false;
let cvReady = false;

/**
 * Callback quando OpenCV carrega
 */
function onOpenCVReady() {
    cvReady = true;
    console.log('✅ OpenCV.js carregado');
    initApp();
}

/**
 * Inicializa a aplicativo
 */
function initApp() {
    console.log('🚀 Iniciando LeGab OMR...');
    
    // Inicializa UI
    ui = new UIModule({
        videoElement: document.getElementById('video'),
        statusElement: document.getElementById('status'),
        logElement: document.getElementById('log')
    });
    
    // Inicializa OMR com configurações
    omr = new OMRModule({
        numQuestions: 60,
        alternativesPerQuestion: 5,
        columns: 2,
        fillThreshold: 0.4,
        debug: false
    });
    
    // Inicializa câmera
    camera = new CameraModule({
        onFrame: processFrame
    });
    
    startCamera();
}

/**
 * Inicia a câmera
 */
async function startCamera() {
    const video = document.getElementById('video');
    
    try {
        ui.setStatus('📷 Iniciando câmera...', 'info');
        log('Verificando permissões...');
        
        await camera.start(video);
        
        ui.setStatus('✅ Câmera ativa', 'success');
        log(`Resolução: ${video.videoWidth}x${video.videoHeight}`);
        
        // Adiciona controles
        setupControls();
        
    } catch (error) {
        ui.setStatus('❌ Erro: ' + error.message, 'error');
        log('Erro: ' + error.message);
        alert('Erro na câmera: ' + error.message);
    }
}

/**
 * Configura botões da interface
 */
function setupControls() {
    const btnCapture = document.getElementById('btn-capture');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    
    if (btnCapture) {
        btnCapture.classList.remove('hidden');
        btnCapture.onclick = captureAndProcess;
    }
    
    if (btnStop) {
        btnStop.classList.remove('hidden');
        btnStop.onclick = stopCamera;
    }
    
    if (btnRestart) {
        btnRestart.onclick = restartCamera;
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
 * Captura e processa imagem
 */
async function captureAndProcess() {
    if (isProcessing || !camera) return;
    
    isProcessing = true;
    
    try {
        ui.setStatus('📸 Capturando...', 'info');
        log('Capturando imagem...');
        
        // Captura imagem
        const mat = camera.captureToMat();
        
        ui.setStatus('🔍 Processando...', 'info');
        log('Pré-processando imagem...');
        
        // Pré-processamento
        const processed = PreprocessingModule.processForOMR(mat, {
            blurSize: 5,
            blockSize: 11,
            constant: 2
        });
        
        // Detecta documento e corrige perspectiva
        log('Detectando documento...');
        const correction = PerspectiveModule.autoCorrect(mat, {
            width: 600,
            height: 800
        });
        
        let processMat = mat;
        if (correction.success && correction.corrected) {
            log('Perspectiva corrigida');
            processMat = correction.corrected;
        }
        
        // Processa OMR
        log('Lendo gabarito...');
        ui.setStatus('📖 Lendo respostas...', 'info');
        
        const results = omr.processImage(processed.threshold);
        const answers = omr.extractAnswers(results);
        
        log(`Questões processadas: ${answers.length}`);
        
        // Carrega gabarito correto
        const config = loadConfig();
        const correctAnswers = config.correctAnswers ? 
            config.correctAnswers.toUpperCase().split('') : null;
        
        if (!correctAnswers || correctAnswers.length === 0) {
            log('⚠️ Gabarito não configurado!');
            alert('Configure o gabarito em Config primeiro!');
        } else {
            // Compara respostas
            const comparison = omr.compareWithKey(answers, correctAnswers);
            
            // Mostra resultados
            ui.showResults(results, correctAnswers.join(''));
            
            log(`Acertos: ${comparison.correct}/${comparison.total} (${comparison.percentage}%)`);
        }
        
        ui.setStatus('✅ Concluído!', 'success');
        
        // Limpeza
        mat.delete();
        if (processed.gray) processed.gray.delete();
        if (processed.blurred) processed.blurred.delete();
        if (processed.threshold) processed.threshold.delete();
        if (processed.edges) processed.edges.delete();
        if (correction.corrected) correction.corrected.delete();
        
    } catch (error) {
        console.error('Erro no processamento:', error);
        ui.setStatus('❌ Erro: ' + error.message, 'error');
        log('Erro: ' + error.message);
    } finally {
        isProcessing = false;
    }
}

/**
 * Processa frame em tempo real (opcional)
 */
function processFrame(mat, canvas) {
    // Detecção em tempo real (opcional)
    // Por enquanto, processamento manual via botão
}

/**
 * Carrega configurações do localStorage
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

// Inicializa quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado');
    // Aguarda OpenCV carregar
    if (!cvReady) {
        log('Carregando OpenCV...');
    }
});

// Exporta funções globais
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.captureAndProcess = captureAndProcess;
window.initApp = initApp;
