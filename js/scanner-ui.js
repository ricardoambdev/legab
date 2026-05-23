let stream = null;
let videoElement = null;

async function startCamera() {
    const statusEl = document.getElementById('camera-status');
    
    try {
        console.log('📷 Passo 1: Verificando suporte...');
        if (statusEl) statusEl.textContent = 'Verificando suporte...';
        
        // Verifica se navigator.mediaDevices existe
        if (!navigator.mediaDevices) {
            throw new Error('navigator.mediaDevices não disponível. Use HTTPS ou localhost.');
        }
        
        console.log('📷 Passo 2: Obtendo getUserMedia...');
        if (statusEl) statusEl.textContent = 'Solicitando permissão...';
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        console.log('📷 Passo 3: Chamando getUserMedia...');
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Stream obtida com sucesso!');
        
        if (statusEl) statusEl.textContent = 'Stream obtida!';
        
        stream = mediaStream;
        videoElement = document.getElementById('video');
        
        if (!videoElement) {
            throw new Error('Elemento <video> não encontrado no HTML');
        }
        
        console.log('📺 Passo 4: Atribuindo stream ao vídeo...');
        videoElement.srcObject = stream;
        
        console.log('📺 Passo 5: Aguardando carregamento...');
        if (statusEl) statusEl.textContent = 'Carregando vídeo...';
        
        // Aguarda o vídeo carregar
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout: vídeo não carregou em 5 segundos'));
            }, 5000);
            
            videoElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                console.log('📺 Metadados carregados:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                resolve();
            };
            
            videoElement.onerror = (e) => {
                clearTimeout(timeout);
                reject(new Error('Erro no elemento de vídeo'));
            };
        });
        
        console.log('▶️ Passo 6: Iniciando playback...');
        if (statusEl) statusEl.textContent = 'Iniciando playback...';
        
        await videoElement.play();
        
        console.log('✅ SUCESSO! Câmera iniciada:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        if (statusEl) statusEl.textContent = `✅ Câmera ativa: ${videoElement.videoWidth}x${videoElement.videoHeight}`;
        
        // Adiciona botões de controle
        const btnStop = document.getElementById('btn-stop');
        const btnRestart = document.getElementById('btn-restart');
        
        if (btnStop) {
            btnStop.classList.remove('hidden');
            btnStop.onclick = () => {
                console.log('⏹️ Parando câmera...');
                stopCamera();
                btnStop.classList.add('hidden');
                if (btnRestart) btnRestart.classList.remove('hidden');
                if (statusEl) statusEl.textContent = 'Câmera parada';
            };
        }
        
        if (btnRestart) {
            btnRestart.onclick = () => {
                console.log('🔄 Reiniciando...');
                stopCamera();
                startCamera();
            };
        }
        
    } catch (error) {
        console.error('❌ ERRO NA CÂMERA:', error.name, '-', error.message);
        let msg = error.message;
        
        if (error.name === 'NotAllowedError') {
            msg = 'Permissão negada! Clique no ícone de cadeado 🔒 na barra de endereço e permita a câmera.';
        } else if (error.name === 'NotFoundError') {
            msg = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (error.name === 'NotReadableError') {
            msg = 'Câmera ocupada ou com erro. Tente fechar outros apps.';
        } else if (error.name === 'OverconstrainedError') {
            msg = 'Resolução não suportada. Tente outro dispositivo.';
        } else if (window.location.protocol === 'http:') {
            msg = 'HTTPS necessário! Use GitHub Pages ou localhost.';
        }
        
        if (statusEl) statusEl.textContent = '❌ Erro: ' + msg;
        alert('Erro na câmera:\n\n' + msg + '\n\nDetalhes: ' + error.name + ' - ' + error.message);
    }
}

function stopCamera() {
    console.log('⏹️ Parando câmera...');
    
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('Track parada:', track.label);
        });
        stream = null;
    }
    
    if (videoElement) {
        videoElement.srcObject = null;
        videoElement = null;
    }
    
    console.log('✅ Câmera parada');
}

// Inicia quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado');
    console.log('🔗 Protocolo:', window.location.protocol);
    console.log('📍 URL:', window.location.href);
    
    const statusEl = document.getElementById('camera-status');
    
    if (statusEl) {
        statusEl.textContent = 'Iniciando...';
    }
    
    // Pequeno delay para garantir que o DOM está pronto
    setTimeout(() => {
        console.log('🚦 Iniciando câmera...');
        startCamera();
    }, 500);
});

// Test button
document.addEventListener('DOMContentLoaded', () => {
    const btnTest = document.getElementById('btn-test');
    if (btnTest) {
        btnTest.addEventListener('click', () => {
            console.log('🧪 Testando câmera...');
            const statusEl = document.getElementById('camera-status');
            if (statusEl) statusEl.textContent = 'Testando...';
            startCamera();
        });
    }
});