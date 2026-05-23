# LeGab - Sistema de Correção Automática de Gabaritos OMR

Sistema web profissional para leitura e correção automática de gabaritos usando câmera de celular.

## 🎯 Funcionalidades

- **Scanner OMR**: Leitura automática de gabaritos via câmera traseira
- **Correção de Perspectiva**: Alinhamento automático usando OpenCV.js
- **Detecção OMR**: Reconhecimento de bolhas A/B/C/D/E
- **Gerador de PDF**: Folhas de resposta e gabaritos preenchidos para impressão
- **Dashboard**: Histórico e estatísticas de resultados
- **Firebase**: Sincronização e armazenamento em nuvem
- **PWA**: Funcionamento offline e instalável no celular

## 🚀 Tecnologias

- HTML5 / CSS3 / JavaScript ES6
- **OpenCV.js** - Processamento de imagem
- **Firebase Firestore** - Armazenamento em nuvem
- **jsPDF** - Geração de PDFs
- **Material Icons** - Interface visual
- GitHub Pages - Hospedagem

## 📁 Estrutura

```
legab/
├── index.html        # Scanner OMR
├── generate.html     # Gerador de folhas
├── settings.html     # Configurações
├── dashboard.html    # Dashboard e histórico
├── css/
│   └── style.css     # Estilos
└── js/
    ├── app.js        # Lógica principal
    ├── firebase.js   # Conexão Firebase
    ├── generator.js  # Gerador de PDFs
    └── omr/          # Módulos OMR
        ├── camera.js
        ├── preprocessing.js
        ├── perspective.js
        ├── omr.js
        └── ui.js
```

## 📋 Como Usar

### 1. Configurar
Acesse `settings.html` e configure:
- Gabarito oficial (uma letra por questão)
- Número de questões
- Sensibilidade de leitura

### 2. Gerar Folhas
Acesse `generate.html` para gerar:
- Folha de respostas vazia (para alunos)
- Gabarito preenchido (para correção)

### 3. Scanner
Acesse `index.html` (página principal):
1. Permita acesso à câmera
2. Enquadre o gabarito na moldura
3. Toque no botão de captura
4. Veja o resultado instantaneamente

### 4. Dashboard
Acesse `dashboard.html` para ver:
- Histórico de correções
- Média da turma
- Exportação CSV

## 🔧 Configuração Firebase

Edite `js/firebase.js` com suas credenciais:
```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};
```

## 🖨️ Impressão

As folhas são geradas em formato A4 (210x297mm) com:
- Cabeçalho laranja
- Campos para nome e série
- Instruções
- 60 questões em 3 colunas
- Bolhas circulares para OMR

## 📊 Parâmetros OMR

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| threshold | 0.4 (40%) | Sensibilidade de detecção |
| questions | 60 | Número de questões |
| alternatives | 5 | Alternativas por questão |
| columns | 3 | Colunas no layout |

## 📦 Deploy

O projeto é compatível com GitHub Pages. Basta configurar o repositório para publicar a branch `main`.

## 📄 Licença

Projeto open-source para uso educacional.