# LeGab - Sistema de Correção de Gabaritos OMR

Sistema web para leitura e correção automática de gabaritos usando tecnologia OMR (Optical Mark Recognition) com OpenCV.js.

## 📋 Estrutura do Projeto
```
legab/
├── index.html         # Scanner OMR
├── generate.html      # Gerador de gabaritos
├── config.html        # Configurações
├── css/
│   └── style.css      # Estilos
└── js/
    ├── omr/           # Módulos OMR
    │   ├── camera.js    # Gerenciamento de câmera
    │   ├── preprocessing.js # Processamento de imagem
    │   ├── perspective.js  # Correção de perspectiva
    │   ├── omr.js       # Lógica OMR
    │   └── ui.js        # Interface
    └── app.js         # Lógica principal
```

## 🚀 Como Começar
1. Clone o repositório:
```bash
   git clone https://github.com/ricardoambdev/legab.git
```

2. Abra `index.html` em um navegador moderno

3. Permita acesso à câmera

4. Aponte para um gabarito e capture

## 📄 Funcionalidades
- ✅ Leitura automática de gabaritos via câmera
- ✅ Correção de perspectiva
- ✅ Detecção de respostas A/B/C/D/E
- ✅ Comparação com gabarito oficial
- ✅ Geração de PDFs para impressão
- ✅ Armazenamento de configurações

## 📸 Requisitos
- Navegador com suporte a câmera
- OpenCV.js
- Folhas A4 impressas com gabarito padrão