# LeGab - Sistema de Leitura de Gabaritos

Sistema web para criação, impressão e correção automática de gabaritos de provas utilizando câmera de celular e OCR.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Como Usar](#como-usar)
- [Modelo do Gabarito](#modelo-do-gabarito)
- [API e Armazenamento](#api-e-armazenamento)
- [Solução de Problemas](#solução-de-problemas)
- [Créditos](#créditos)

## Visão Geral

O **LeGab** é um sistema completo para professores e instituições de ensino que permite:

- Criar gabaritos personalizados para impressão
- Imprimir folhas de respostas no formato A4
- Corrigir automaticamente usando a câmera do celular
- Armazenar configurações na nuvem (Firebase)

## Funcionalidades

### Página Configurações
- Definir número total de questões (padrão: 65)
- Configurar número de alternativas (3-5)
- Configurar colunas (esquerda: 33, direita: 32)
- Definir nota de aprovação (%)
- Adicionar nome da escola/instituição
- Adicionar logo (URL)
- Criar gabarito usando interface visual (clique nas alternativas)
- Gerar gabarito aleatório ou manual
- Contador de caracteres em tempo real
- Salvar/Carregar do Firebase ou LocalStorage

### Página Gerar
- Gerar gabarito em branco (para aluno preencher)
- Gerar gabarito com respostas (para correção)
- Formato A4 profissional
- Cabeçalho com logo e nome da escola
- Campos: Nome, Turma/Série, Data (automática)
- Instruções impressas
- Bolhas quadradas para marcação
- Impressão otimizada

### Página Scanner
- Capturar imagem da câmera
- Detectar bolhas preenchidas (análise de pixels)
- OCR com Tesseract.js
- Correção automática
- Contagem de acertos, erros e questões em branco
- Cálculo de porcentagem
- Indicação de aprovação/reprovação
- Entrada manual de respostas (fallback)
- Logs de debug na tela

## Tecnologias

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| HTML5 | - | Estrutura das páginas |
| CSS3 | - | Estilização Material Design |
| JavaScript (ES6+) | - | Lógica da aplicação |
| Firebase | 9.22.0 | Armazenamento em nuvem |
| Tesseract.js | 5.x | OCR (reconhecimento de texto) |
| QRCode.js | 1.5.3 | Geração de QR Codes |
| Google Fonts | - | Fonte Roboto |
| Material Icons | - | Ícones |

## Estrutura do Projeto

```
legab/
├── index.html              # Scanner e correção
├── config.html             # Configurações do sistema
├── generate.html           # Geração de gabaritos
├── manifest.json           # PWA manifest
├── css/
│   ├── style.css          # Estilos principais (legado)
│   ├── material.css       # Material Design (laranja)
│   └── gabarito.css      # Estilos do gabarito
├── js/
│   ├── config.js          # Gerenciador de configurações
│   ├── config-ui.js       # Interface de configurações
│   ├── generate-ui.js     # Geração de gabaritos
│   ├── generator.js       # Classe de geração
│   ├── scanner.js         # Scanner (legado)
│   └── scanner-ui.js      # Scanner com OCR
└── README.md              # Documentação
```

## Instalação

### Pré-requisitos
- Servidor web (Apache, Nginx, ou similar)
- Ou usar servidor de desenvolvimento

### Passos

1. **Clone o repositório:**
```bash
git clone https://github.com/SEU_USUARIO/legab.git
cd legab
```

2. **Hospede os arquivos:**
   - Opção A: GitHub Pages (gratuito)
     ```bash
     # No GitHub: Settings > Pages > Branch: main
     ```
   
   - Opção B: Servidor local
     ```bash
     # Python
     python -m http.server 8000
     
     # Node.js
     npx serve
     ```

3. **Acesse:**
   - Local: `http://localhost:8000`
   - GitHub Pages: `https://SEU_USUARIO.github.io/legab`

## Configuração

### Firebase (Opcional)

1. Crie um projeto em [Firebase Console](https://console.firebase.google.com)
2. Adicione um app Web
3. Copie as credenciais
4. Edite `js/config.js`:

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

**Sem Firebase:** O sistema usa LocalStorage automaticamente.

### Configurações Padrão

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `numQuestions` | 65 | Total de questões |
| `numAlternatives` | 5 | Alternativas (A-E) |
| `leftColumn` | 33 | Questões na coluna esquerda |
| `rightColumn` | 32 | Questões na coluna direita |
| `passingScore` | 60 | Nota de aprovação (%) |
| `schoolName` | '' | Nome da escola |
| `logoUrl` | '' | URL do logo |

## Como Usar

### 1. Configurar o Gabarito

1. Acesse **Config**
2. Preencha:
   - Nome da escola
   - Logo (opcional)
   - Total de questões
   - Alternativas
   - Colunas
3. Clique nas alternativas para criar o gabarito
4. Clique em **Salvar**

### 2. Gerar Folha de Respostas

1. Acesse **Gerar**
2. Escolha:
   - **Em Branco**: Para alunos preencherem
   - **Com Respostas**: Para correção
3. Imprima em A4

### 3. Corrigir com Scanner

1. Acesse **Scanner**
2. Clique em **Iniciar Câmera**
3. Aponte para o gabarito preenchido
4. Clique em **Capturar**
5. Veja o resultado:
   - ✅ Acertos
   - ❌ Erros
   - ⚪ Em branco
   - 📊 Porcentagem

### 4. Entrada Manual

Se o scanner falhar:
1. Digite as respostas no campo
2. Pressione **Verificar**

## Modelo do Gabarito

### Estrutura A4

````
┌─────────────────────────────────────────────┐
│ [Logo] SIMULADO TRIMESTRAL                  │
│         Folha de Respostas           GABARITO│
├─────────────────────────────────────────────┤
│ Instruções:                                 │
│ 1. Assinale apenas uma resposta             │
│ 2. Utilize caneta azul ou preta             │
│ 3. Não rasure ou amasse                     │
│ 4. Questões em branco = erro                │
├─────────────────────────────────────────────┤
│ Nome: _______________ Turma: ___ Data: __   │
├─────────────────────────────────────────────┤
│ Q  A  B  C  D  E    Q  A  B  C  D  E        │
│ 1  □  □  □  □  □   34 □  □  □  □  □        │
│ 2  □  □  ■  □  □   35 □  ■  □  □  □        │
│ ...                                        │
│ 33 ■  □  □  □  □   65 □  ■  □  □  □        │
└─────────────────────────────────────────────┘
````

### Especificações

- **Tamanho:** A4 (210mm x 297mm)
- **Questões:** 65 (33 esq + 32 dir)
- **Alternativas:** A-E (quadradas)
- **Respostas:** Preenchidas em laranja (#FF6D00)
- **Fonte:** Roboto

## API e Armazenamento

### Estrutura de Dados

```javascript
{
  "numQuestions": 65,
  "numAlternatives": 5,
  "leftColumn": 33,
  "rightColumn": 32,
  "passingScore": 60,
  "schoolName": "Escola Exemplo",
  "logoUrl": "https://exemplo.com/logo.png",
  "correctAnswers": "ABCDEDBACD...",
  "updatedAt": "2025-05-22T10:30:00.000Z"
}
```

### Firebase Collections

- `configs/main` - Configurações do sistema

### LocalStorage

- `legab_config` - Configurações salvas localmente

## Solução de Problemas

### O scanner não detecta as respostas

**Causas possíveis:**
- Iluminação inadequada
- Gabarito inclinado
- Bolhas não preenchidas completamente
- Baixo contraste

**Soluções:**
1. Use boa iluminação (luz natural ou branca)
2. Mantenha o gabarito reto
3. Preencha as bolhas completamente
4. Aproxime a câmera
5. Use entrada manual como fallback

### Firebase não carrega

**Verifique:**
1. Credenciais no `config.js`
2. Regras do Firestore (leitura/escrita)
3. Conexão com internet

**Solução temporária:** Use LocalStorage (automático)

### Erro ao imprimir

**Verifique:**
1. Configurações de impressão (A4)
2. Margens (mínimas)
3. Plano de fundo (ativar "background graphics")

### Layout desformatado

**Ajustes:**
- Verifique o zoom (100%)
- Use navegador atualizado
- Limpe cache do navegador

## Créditos

### Desenvolvedor
- Criado por [Seu Nome]

### Bibliotecas
- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) - QR Codes
- [Firebase](https://firebase.google.com/) - Backend
- [Google Fonts](https://fonts.google.com/) - Tipografia
- [Material Icons](https://fonts.google.com/icons) - Ícones

### Licença
MIT License

---

**Versão:** 2.0  
**Última atualização:** Maio 2025  
**Compatibilidade:** Navegadores modernos (Chrome, Firefox, Edge, Safari)

## Contato

Para dúvidas ou sugestões, abra uma issue no repositório.