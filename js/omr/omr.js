/**
 * Módulo OMR (Optical Mark Recognition)
 * Detecta e lê marcações de gabarito
 */
class OMRModule {
    constructor(config = {}) {
        this.config = {
            numQuestions: config.numQuestions || 60,
            alternativesPerQuestion: config.alternativesPerQuestion || 5,
            columns: config.columns || 2,
            fillThreshold: config.fillThreshold || 0.5,
            minMarkCoverage: config.minMarkCoverage || 0.3,
            ...config
        };
        
        this.bubbleGrid = null;
        this.debug = config.debug || false;
    }

    /**
     * Gera grid de bolhas baseado nas dimensões do gabarito
     */
    generateBubbleGrid(width, height) {
        const { numQuestions, alternativesPerQuestion, columns } = this.config;
        
        const questionsPerColumn = Math.ceil(numQuestions / columns);
        const columnWidth = width / columns;
        const rowsPerQuestion = height / (questionsPerColumn * 2);
        
        const grid = [];
        
        for (let col = 0; col < columns; col++) {
            const colX = col * columnWidth;
            
            for (let q = 0; q < questionsPerColumn; q++) {
                const questionNum = col * questionsPerColumn + q + 1;
                if (questionNum > numQuestions) break;
                
                const questionBubbles = [];
                const bubbleHeight = rowsPerQuestion / alternativesPerQuestion;
                const bubbleWidth = columnWidth / alternativesPerQuestion;
                
                for (let alt = 0; alt < alternativesPerQuestion; alt++) {
                    const x = colX + (alt * bubbleWidth) + (bubbleWidth * 0.2);
                    const y = (q * rowsPerQuestion * 2) + (alt * bubbleHeight) + (rowsPerQuestion * 0.3);
                    const w = bubbleWidth * 0.6;
                    const h = bubbleHeight * 0.5;
                    
                    questionBubbles.push({
                        question: questionNum,
                        alternative: String.fromCharCode(65 + alt), // A, B, C...
                        x, y, w, h,
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
        const { x, y, w, h } = bubble;
        
        // ROI da bolha
        const roi = src.roi(
            new cv.Rect(
                Math.floor(x), 
                Math.floor(y), 
                Math.floor(w), 
                Math.floor(h)
            )
        );
        
        if (roi.empty()) return { filled: false, confidence: 0 };
        
        // Calcula porcentagem de pixels escuros
        const mean = cv.mean(roi)[0];
        const fillPercentage = 1 - (mean / 255);
        
        roi.delete();
        
        return {
            filled: fillPercentage >= this.config.fillThreshold,
            confidence: fillPercentage,
            fillPercentage
        };
    }

    /**
     * Processa todas as bolhas e retorna respostas
     */
    processImage(src) {
        const { numQuestions, alternativesPerQuestion } = this.config;
        const results = [];
        
        // Gera grid se não existir
        if (!this.bubbleGrid) {
            this.generateBubbleGrid(src.cols, src.rows);
        }
        
        // Processa cada questão
        for (let q = 0; q < this.bubbleGrid.length; q++) {
            const questionBubbles = this.bubbleGrid[q];
            const questionResults = {
                question: q + 1,
                answers: [],
                selected: null,
                confidence: 0
            };
            
            let maxConfidence = 0;
            
            // Verifica cada alternativa
            for (const bubble of questionBubbles) {
                const detection = this.detectBubbleMark(src, bubble);
                
                questionResults.answers.push({
                    alternative: bubble.alternative,
                    filled: detection.filled,
                    confidence: detection.confidence
                });
                
                if (detection.confidence > maxConfidence) {
                    maxConfidence = detection.confidence;
                    questionResults.selected = bubble.alternative;
                    questionResults.confidence = detection.confidence;
                }
            }
            
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
                answer: result.selected,
                confidence: result.confidence
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
        
        for (let i = 0; i < answers.length; i++) {
            const userAnswer = answers[i];
            const correct = correctAnswers[i];
            
            const detail = {
                question: userAnswer.question,
                userAnswer: userAnswer.answer,
                correctAnswer: correct,
                isCorrect: userAnswer.answer === correct,
                confidence: userAnswer.confidence
            };
            
            if (!userAnswer.answer || userAnswer.answer === '') {
                results.blank++;
                detail.status = 'blank';
            } else if (userAnswer.answer === correct) {
                results.correct++;
                detail.status = 'correct';
            } else {
                results.wrong++;
                detail.status = 'wrong';
            }
            
            results.details.push(detail);
        }
        
        results.percentage = Math.round((results.correct / results.total) * 100);
        
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
                const rect = new cv.Rect(
                    Math.floor(bubble.x),
                    Math.floor(bubble.y),
                    Math.floor(bubble.w),
                    Math.floor(bubble.h)
                );
                cv.rectangle(dst, rect, color, 1);
            }
        }
        
        return dst;
    }
}

window.OMRModule = OMRModule;
