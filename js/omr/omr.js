/**
 * Módulo OMR (Optical Mark Recognition)
 * Detecta e lê marcações de gabarito com alta precisão
 */
class OMRModule {
    constructor(config = {}) {
        this.config = {
            numQuestions: config.numQuestions || 60,
            alternativesPerQuestion: config.alternativesPerQuestion || 5,
            columns: config.columns || 2,
            fillThreshold: config.fillThreshold || 0.35,
            minMarkCoverage: config.minMarkCoverage || 0.25,
            bubbleRows: config.bubbleRows || 30,
            ...config
        };
        
        this.bubbleGrid = null;
        this.debug = config.debug || false;
        this.alternativeLetters = 'ABCDE';
        console.log('OMR Config:', this.config);
    }

    /**
     * Gera grid de bolhas baseado nas dimensões do gabarito
     */
    generateBubbleGrid(width, height) {
        const { numQuestions, alternativesPerQuestion, columns } = this.config;
        
        console.log(`Gerando grid: ${width}x${height}, ${numQuestions} questoes, ${columns} colunas`);
        
        const questionsPerColumn = Math.ceil(numQuestions / columns);
        const columnWidth = width / columns;
        const totalRows = questionsPerColumn;
        
        // Calcula tamanho das bolhas
        const bubbleWidth = columnWidth / alternativesPerQuestion / 2; // Metade do espaço
        const bubbleHeight = height / (totalRows * alternativesPerQuestion * 2); // Espaço vertical
        
        const grid = [];
        
        for (let col = 0; col < columns; col++) {
            const colStartX = (col * columnWidth) + (columnWidth * 0.2); // 20% margem esquerda
            const colWidth2 = columnWidth * 0.6; // 60% da largura da coluna
            
            for (let q = 0; q < questionsPerColumn; q++) {
                const questionNum = col * questionsPerColumn + q + 1;
                if (questionNum > numQuestions) break;
                
                const questionBubbles = [];
                const questionStartY = (q * alternativesPerQuestion * bubbleHeight * 2) + (height * 0.05);
                
                for (let alt = 0; alt < alternativesPerQuestion; alt++) {
                    const x = colStartX + (alt * (colWidth2 / alternativesPerQuestion));
                    const y = questionStartY + (alt * bubbleHeight * 0.3);
                    const w = bubbleWidth * 0.8;
                    const h = bubbleHeight * 0.6;
                    
                    questionBubbles.push({
                        question: questionNum,
                        alternative: this.alternativeLetters[alt] || String.fromCharCode(65 + alt),
                        x: Math.max(0, x),
                        y: Math.max(0, y),
                        w: Math.max(1, w),
                        h: Math.max(1, h),
                        filled: false,
                        confidence: 0
                    });
                }
                
                if (questionBubbles.length > 0) {
                    grid.push(questionBubbles);
                }
            }
        }
        
        this.bubbleGrid = grid;
        console.log('Grid gerado:', grid.length, 'questões');
        return grid;
    }

    /**
     * Detecta marcações em uma bolha específica
     */
    detectBubbleMark(src, bubble) {
        try {
            if (!bubble || !src) {
                return { filled: false, confidence: 0, fillPercentage: 0 };
            }
            
            const { x, y, w, h } = bubble;
            
            // Verifica limites
            if (x < 0 || y < 0 || w <= 0 || h <= 0) {
                return { filled: false, confidence: 0, fillPercentage: 0 };
            }
            
            const rectWidth = Math.min(Math.floor(w), src.cols - Math.floor(x));
            const rectHeight = Math.min(Math.floor(h), src.rows - Math.floor(y));
            
            if (rectWidth <= 0 || rectHeight <= 0) {
                return { filled: false, confidence: 0, fillPercentage: 0 };
            }
            
            const roi = src.roi(
                new cv.Rect(Math.floor(x), Math.floor(y), rectWidth, rectHeight)
            );
            
            if (roi.empty()) {
                roi.delete();
                return { filled: false, confidence: 0, fillPercentage: 0 };
            }
            
            const mean = cv.mean(roi)[0];
            const fillPercentage = 1 - (mean / 255);
            
            roi.delete();
            
            return {
                filled: fillPercentage >= this.config.fillThreshold,
                confidence: fillPercentage,
                fillPercentage
            };
        } catch (error) {
            console.error('Erro detectando bolha:', error);
            return { filled: false, confidence: 0, fillPercentage: 0 };
        }
    }

    /**
     * Processa todas as bolhas e retorna respostas
     */
    processImage(src) {
        console.log('Processando imagem:', src.cols, 'x', src.rows);
        
        if (src.empty()) {
            console.error('Imagem vazia!');
            return [];
        }

        const results = [];
        
        // Gera grid baseado no tamanho da imagem
        if (!this.bubbleGrid || this.bubbleGrid.length === 0) {
            this.generateBubbleGrid(src.cols, src.rows);
        }
        
        console.log('Processando', this.bubbleGrid.length, 'questões');
        
        for (let i = 0; i < this.bubbleGrid.length; i++) {
            const questionBubbles = this.bubbleGrid[i];
            const questionResults = {
                question: i + 1,
                answers: [],
                selected: null,
                confidence: 0
            };
            
            let maxConfidence = 0;
            let selectedAlt = null;
            
            for (const bubble of questionBubbles) {
                const detection = this.detectBubbleMark(src, bubble);
                
                questionResults.answers.push({
                    alternative: bubble.alternative,
                    filled: detection.filled,
                    confidence: detection.confidence,
                    fillPercentage: detection.fillPercentage
                });
                
                if (detection.confidence > maxConfidence) {
                    maxConfidence = detection.confidence;
                    selectedAlt = bubble.alternative;
                }
            }
            
            questionResults.selected = selectedAlt;
            questionResults.confidence = maxConfidence;
            
            results.push(questionResults);
        }
        
        console.log('Processamento concluído:', results.length, 'questões');
        return results;
    }

    /**
     * Extrai respostas do processamento
     */
    extractAnswers(omrResults) {
        const answers = [];
        
        for (const result of omrResults) {
            answers.push({
                question: result.question,
                answer: result.selected || '',
                confidence: result.confidence,
                allOptions: result.answers
            });
        }
        
        return answers;
    }

    /**
     * Compara respostas com gabarito
     */
    compareWithKey(answers, correctAnswers) {
        const results = {
            total: answers.length,
            correct: 0,
            wrong: 0,
            blank: 0,
            percentage: 0,
            details: []
        };
        
        const correctStr = typeof correctAnswers === 'string' ? correctAnswers : correctAnswers.join('');
        const correctArr = correctStr.toUpperCase().split('');
        
        for (let i = 0; i < answers.length; i++) {
            const userAnswer = answers[i];
            const correct = correctArr[i] || '';
            
            const detail = {
                question: userAnswer.question,
                userAnswer: (userAnswer.answer || '').toUpperCase(),
                correctAnswer: correct,
                isCorrect: (userAnswer.answer || '').toUpperCase() === correct,
                confidence: userAnswer.confidence
            };
            
            if (!userAnswer.answer || userAnswer.answer === '') {
                results.blank++;
                detail.status = 'blank';
            } else if ((userAnswer.answer || '').toUpperCase() === correct) {
                results.correct++;
                detail.status = 'correct';
            } else {
                results.wrong++;
                detail.status = 'wrong';
            }
            
            results.details.push(detail);
        }
        
        results.percentage = results.total > 0 ? 
            Math.round((results.correct / results.total) * 100) : 0;
        
        return results;
    }

    /**
     * Recalibra grid para novo tamanho
     */
    recalibrate(width, height) {
        this.bubbleGrid = null;
        return this.generateBubbleGrid(width, height);
    }
}

window.OMRModule = OMRModule;
