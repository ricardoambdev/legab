/**
 * LeGab - Aplicação Principal
 * Sistema OMR de leitura de gabaritos
 */

let camera = null;
let omr = null;
let cvReady = false;
let processing = false;

function onOpenCVReady() {
  cvReady = true;
  console.log('✅ OpenCV.js carregado');
  initApp();
}

async function initApp() {
  console.log('🚀 Iniciando LeGab...');

  await Firebase.init();
  const config = await Firebase.loadConfig();

  camera = new Camera();
  omr = new OMR({
    questions: config.questions,
    alternatives: config.alternatives,
    threshold: config.threshold
  });

  startCamera();
}

async function startCamera() {
  const video = document.getElementById('video');
  UI.status('Iniciando câmera...', 'info');

  try {
    const { width, height } = await camera.start(video);
    UI.status(`Câmera ativa: ${width}x${height}`, 'success');
  } catch (err) {
    UI.status('Erro: ' + err.message, 'error');
    console.error(err);
  }
}

async function captureAndProcess() {
  if (!cvReady) { alert('Aguarde o OpenCV carregar...'); return; }
  if (processing || !camera.active) return;

  processing = true;
  UI.showLoading('Capturando...');
  UI.status('Processando...', 'info');

  try {
    const src = camera.captureToMat();
    if (src.empty()) throw new Error('Imagem vazia');

    // Pré-processamento
    const { thresh } = Preprocessing.process(src);

    // Correção de perspectiva
    const corners = Perspective.findDocument(src);
    let processMat = thresh;

    if (corners) {
      const warped = Perspective.warp(src, corners, 600, 800);
      const processed = Preprocessing.process(warped);
      processMat = processed.thresh;
      Preprocessing.cleanup(warped);
      Preprocessing.cleanup(processed.thresh);
    }

    // OMR
    omr.buildGrid(processMat.cols, processMat.rows);
    const results = omr.process(processMat);

    // Carrega gabarito
    const config = await Firebase.loadConfig();
    const correctStr = config.answers ? Object.values(config.answers).join('') : '';
    const correct = correctStr.toUpperCase().split('');

    // Compara
    const comparison = omr.compare(results, correct);

    // Salva resultado
    const studentName = prompt('Nome do aluno:', '');
    await Firebase.saveResults({
      name: studentName || 'Anônimo',
      ...comparison
    });

    // Mostra resultado
    UI.showResults(results, correct);

    // Limpeza
    Preprocessing.cleanup([src, thresh, processMat]);

    UI.status(`Concluído: ${comparison.percentage}%`, 'success');
    UI.hideLoading();

  } catch (err) {
    console.error(err);
    UI.status('Erro: ' + err.message, 'error');
    UI.hideLoading();
  } finally {
    processing = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!cvReady) {
    UI.status('Aguardando carregamento...', 'info');
  }
});