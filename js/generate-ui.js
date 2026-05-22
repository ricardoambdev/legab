let currentConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    const configManager = new ConfigManager();
    const generator = new GabaritoGenerator();

    const btnGenerateBlank = document.getElementById('btn-generate-blank');
    const btnGenerateKey = document.getElementById('btn-generate-key');
    const btnCopy = document.getElementById('btn-copy');
    const btnPrint = document.getElementById('btn-print');
    const gabaritoPreview = document.getElementById('gabarito-preview');
    const gabaritoPages = document.getElementById('gabarito-pages');
    const qrSection = document.getElementById('qr-section');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const noConfigMsg = document.getElementById('no-config-msg');
    const generateSection = document.getElementById('generate-section');

    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `md-toast ${isError ? 'error' : 'success'} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function generateQRCode(answers) {
        if (!currentConfig) return;

        qrcodeContainer.innerHTML = '';

        const qrData = generator.generateQRData(answers, {
            questions: currentConfig.numQuestions,
            alternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn
        });

        QRCode.toCanvas(qrData, {
            width: 200,
            margin: 2
        }, (error, canvas) => {
            if (error) {
                console.error(error);
                return;
            }
            qrcodeContainer.appendChild(canvas);
        });
    }

    btnGenerateBlank.addEventListener('click', () => {
        if (!currentConfig) {
            showToast('Configure o gabarito primeiro!', true);
            return;
        }

        const configData = {
            numQuestions: currentConfig.numQuestions,
            numAlternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn,
            schoolName: currentConfig.schoolName || '',
            logoUrl: currentConfig.logoUrl || '',
            answers: ''
        };

        const pagesHTML = generator.createGabaritoHTML(configData, null);
        gabaritoPages.innerHTML = pagesHTML;
        gabaritoPreview.classList.remove('hidden');
        qrSection.classList.remove('hidden');

        generateQRCode('');

        btnCopy.classList.add('hidden');
        gabaritoPreview.scrollIntoView({ behavior: 'smooth' });
        showToast('Gabarito em branco gerado!');
    });

    btnGenerateKey.addEventListener('click', () => {
        if (!currentConfig) {
            showToast('Configure o gabarito primeiro!', true);
            return;
        }

        if (!currentConfig.correctAnswers) {
            showToast('Crie o gabarito primeiro em Config!', true);
            return;
        }

        const configData = {
            numQuestions: currentConfig.numQuestions,
            numAlternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn,
            schoolName: currentConfig.schoolName || '',
            logoUrl: currentConfig.logoUrl || '',
            answers: currentConfig.correctAnswers
        };

        const pagesHTML = generator.createGabaritoHTML(configData, currentConfig.correctAnswers);
        gabaritoPages.innerHTML = pagesHTML;
        gabaritoPreview.classList.remove('hidden');
        qrSection.classList.remove('hidden');

        generateQRCode(currentConfig.correctAnswers);

        btnCopy.classList.remove('hidden');
        gabaritoPreview.scrollIntoView({ behavior: 'smooth' });
        showToast('Gabarito com chave gerado!');
    });

    btnCopy.addEventListener('click', () => {
        if (!currentConfig || !currentConfig.correctAnswers) {
            showToast('Sem gabarito para copiar', true);
            return;
        }

        const dataToCopy = JSON.stringify({
            answers: currentConfig.correctAnswers,
            questions: currentConfig.numQuestions,
            alternatives: currentConfig.numAlternatives,
            leftColumn: currentConfig.leftColumn,
            rightColumn: currentConfig.rightColumn
        });

        navigator.clipboard.writeText(dataToCopy).then(() => {
            showToast('Chave copiada!');
        }).catch(() => {
            showToast('Erro ao copiar', true);
        });
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    configManager.onReady(async () => {
        const config = await configManager.getConfig();

        if (!config || !config.correctAnswers) {
            noConfigMsg.classList.remove('hidden');
            generateSection.classList.add('hidden');
            return;
        }

        currentConfig = config;
        noConfigMsg.classList.add('hidden');
        generateSection.classList.remove('hidden');
    });
});