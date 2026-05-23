/**
 * Configurações do sistema OMR
 * Define parâmetros para reconhecimento de gabaritos
 */
const OMRConfig = {
    // Quantidades
    numQuestions: 60,           // Total de questões
    alternativesPerQuestion: 5, // A, B, C, D, E
    
    // Layout do gabarito
    layout: {
        columns: 2,             // Colunas de questões
        rows: 30,               // Questões por coluna
        alternativeOrder: 'ABCDE' // Ordem das alternativas
    },
    
    // Parâmetros de detecção
    detection: {
        minContourArea: 1000,     // Área mínima do contorno
        maxContourArea: 500000,   // Área máxima do contorno
        cornerThreshold: 0.1,     // Limite para cantos
        aspectRatioTolerance: 0.2 // Tolerância da proporção
    },
    
    // Parâmetros de OMR
    omr: {
        fillThreshold: 0.5,       // Mínimo de preenchimento (50%)
        minMarkCoverage: 0.3,     // Cobertura mínima da marcação
        blurSize: 5,              // Tamanho do blur
        adaptiveBlockSize: 11,    // Bloco do threshold adaptativo
        adaptiveConstant: 2       // Constante do threshold
    },
    
    // Canvas
    canvas: {
        width: 600,
        height: 800
    },
    
    // Debug
    debug: false,
    showOverlays: true
};

// Exporta para window
window.OMRConfig = OMRConfig;
