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
    }

    /**
     * Gera grid de bolhas baseado nas dimensões do gabarito
     */
    generateBubbleGrid(width, height) {
        const { numQuestions, alternativesPerQuestion, columns, bubbleRows } = this.config;
        
        const questionsPerColumn = Math.ceil(numQuestions / columns);
        const columnWidth = width / columns;
        const totalRows = questionsPerColumn * alternativesPerQuestion;
        const bubbleHeight = height / (totalRows / columns * 2);
        const bubbleWidth = columnWidth / alternativesPerQuestion;
        
        const grid = [];
        
        for (let col = 0; col < columns; col++) {
            const startX = (col * columnWidth) + (columnWidth * 0.15);
            const colWidth = columnWidth * 0.7;
            
            for (let q = 0; q < questionsPerColumn; q++) {
                const questionNum = col * questionsPerColumn + q + 1;
                if (questionNum > numQuestions) break;
                
                const questionBubbles = [];
                const startY = (q * alternativesPerQuestion * bubbleHeight) + (bubbleHeight * 0.3);
                
                for (let alt = 0; alt < alternativesPerQuestion; alt++) {
                    const x = startX + (alt * (colWidth / alternativesPerQuestion));
                    const y = startY + (alt * bubbleHeight * 0.1);
                    const w = bubbleWidth * 0.6;
                    const h = bubbleHeight * 0.5;
                    
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
                
                grid.push(questionBubbles);
            }
        }
        
        this.bubbleGrid = grid;
        return grid;
    }

    /**
     * Detecta marcações em uma bolha específica
     */
    detectBubbleMark(src, bubble) {
        try {
            const { x, y, w, h } = bubble;
            
            if (x < 0 || y < 0 || x + w > src.cols || y + h > src.rows) {
                return { filled: false, confidence: 0, fillPercentage: 0 };
            }
            
            const roi = src.roi(
                new cv.Rect(
                    Math.floor(x), 
                    Math.floor(y), 
                    Math.floor(w), 
                    Math.floor(h)
                )
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
        if (src.empty()) {
            console.error('Imagem vazia no processImage');
            return [];
        }

        const results = [];
        
        if (!this.bubbleGrid) {
            this.generateBubbleGrid(src.cols, src.rows);
        }
        
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
                userAnswer: userAnswer.answer || '',
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
     * Desenha grid de bolhas na imagem (debug)
     */
    drawGrid(src, color = [0, 255, 0]) {
        const dst = src.clone();
        
        if (!this.bubbleGrid) {
            this.generateBubbleGrid(src.cols, src.rows);
        }
        
        for (const questionBubbles of this.bubbleGrid) {
            for (const bubble of questionBubbles) {
                const point = new cv.Point(
                    Math.floor(bubble.x + bubble.w / 2),
                    Math.floor(bubble.y + bubble.h / 2)
                );
                const radius = Math.floor(Math.max(bubble.w, bubble.h) / 2);
                cv.circle(dst, point, radius, color, 1);
            }
        }
        
        return dst;
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
