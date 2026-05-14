# LeGab - Sistema de Interpretação de Gabaritos

Sistema em HTML, CSS e JavaScript para interpretar gabaritos de provas usando a câmera do celular.

## Funcionalidades

- **Scanner de Gabarito**: Usa a câmera para escanear e interpretar gabaritos com bolhas preenchidas
- **OCR com Tesseract.js**: Detecta automaticamente as alternativas marcadas
- **Entrada Manual**: Digite as respostas para verificar
- **Gerador de Gabaritos**: Cria gabaritos visuais com bolhas para impressão
- **Configurações**: Define número de questões, alternativas e gabarito correto (Firebase)
- **Verificação de Notas**: Calcula acertos, erros e percentual

## Arquivos

```
legab/
├── index.html        # Scanner com OCR
├── config.html       # Configurações (Firebase + LocalStorage)
├── generate.html     # Gerador de gabaritos para impressão
├── css/
│   ├── style.css     # Estilos principais
│   └── gabarito.css  # Estilos do gabarito visual
├── js/
│   ├── config.js     # Gerenciador Firebase
│   ├── scanner.js    # Scanner + OCR + Verificação
│   └── generator.js # Gerador de gabaritos
├── manifest.json     # Manifesto PWA
└── README.md
```

## Como Usar

### 1. Configurar o Gabarito (Config.html)

1. Acesse `config.html`
2. Defina o número de questões
3. Defina o número de alternativas (3, 4 ou 5)
4. Defina a nota de aprovação (%)
5. Digite o gabarito correto ou deixe vazio para gerar aleatório
6. Clique em "Salvar Configurações"

### 2. Gerar Gabarito para Impressão (Generate.html)

1. Acesse `generate.html`
2. Defina o número de questões
3. Defina o número de alternativas
4. Digite as respostas corretas (opcional - se vazio, gera gabarito em branco)
5. Clique em "Gerar Gabarito"
6. Use os botões para copiar a chave, mostrar/esconder a chave, ou imprimir

### 3. Escanear e Verificar (Index.html)

1. Acesse `index.html` no celular
2. Clique em "Iniciar Câmera"
3. Aponte a câmera para o gabarito preenchido
4. Clique em "Capturar Imagem"
5. O sistema usa OCR para detectar as marcações
6. Veja o resultado com acertos, erros e percentual

## Modelo do Gabarito

Cada questão tem uma linha com:
- Número da questão (Q)
- Bolhas para cada alternativa (A, B, C, D, E)

| Q | A | B | C | D | E |
|---|---|---|---|---|---|
| 1 | ○ | ● | ○ | ○ | ○ |
| 2 | ○ | ○ | ● | ○ | ○ |

O aluno marca a bolha correspondente à resposta correta.

## Configuração do Firebase

O sistema usa Firebase Firestore para armazenar as configurações. Edite `js/config.js` com suas credenciais:

```javascript
const firebaseConfig = {
    apiKey: "SUA-API-KEY",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

Se o Firebase não estiver configurado, o sistema usa LocalStorage automaticamente.

## Bibliotecas Externas

- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR
- [QRCode.js](https://github.com/soldair/node-qrcode) - Gerador de QR Code
- [Firebase](https://firebase.google.com) - Armazenamento de configurações

## Funcionamento Offline

O sistema funciona offline usando LocalStorage. As configurações são salvas localmente e sincronizadas com Firebase quando disponível.

## Teste Local

Para testar localmente, use um servidor HTTP:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve
```

Acesse `http://localhost:8000` no navegador (Chrome no celular para testar a câmera).