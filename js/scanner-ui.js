let stream = null;
let videoElement = null;

async function startCamera() {
    try {
        console.log('📷 Iniciando câmera...');
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Stream obtida');
        
        videoElement = document.getElementById('video');
        if (!videoElement) {
            throw new Error('Elemento <video> não encontrado no HTML');
        }
        
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = async () => {
            console.log('📺 Vídeo carregado:', videoElement.videoWidth, 'x', videoElement.videoHeight);
            try {
                await videoElement.play();
                console.log('▶️ Vídeo reproduzindo');
            } catch (e) {
                console.error('Erro ao dar play:', e);
            }
        };
        
        videoElement.onerror = (e) => {
            console.error('❌ Erro no vídeo:', e);
        };
        
    } catch (error) {
        console.error('❌ Erro na câmera:', error.name, error.message);
        
        let msg = '';
        if (error.name === 'NotAllowedError') {
            msg = 'Permissão negada. Clique no cadeado na barra de endereço e permita a câmera.';
        } else if (error.name === 'NotFoundError') {
            msg = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (error.name === 'NotReadableError') {
            msg = 'Câmera ocupada ou com erro.';
        } else if (window.location.protocol === 'http:') {
            msg = 'HTTPS necessário! Use GitHub Pages ou localhost.';
        } else {
            msg = error.message;
        }
        
        alert('Erro na câmera: ' + msg);
    }
}

async function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Scanner UI iniciado');
    console.log('🔗 Protocolo:', window.location.protocol);
    
    // Inicia a câmera
    await startCamera();
    
    // Botão de reiniciar
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            console.log('🔄 Reiniciando câmera...');
            startCamera();
        });
    }
    
    // Botão de parar
    const btnStop = document.getElementById('btn-stop');
    if (btnStop) {
        btnStop.addEventListener('click', () => {
            console.log('⏹️ Parando câmera...');
            stopCamera();
        });
    }
});
