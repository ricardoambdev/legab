/**
 * Módulo OMR (Optical Mark Recognition)
 */
class OMRModule {
    constructor(config = {}) {
        this.config = {
            numQuestions: config.numQuestions || 60,
            alternativesPerQuestion: config.alternativesPerQuestion || 5,
            columns: config.columns || 2,
            fillThreshold: config.fillThreshold || 0.35,
            ...config
        };
        
        this.bubbleGrid = null;
        this.alternativeLetters = 'ABCDE';
    }

    /**
     * Gera grid de bolhas
     */
    generateBubbleGrid(width, height) {
        const { numQuestions, alternativesPerQuestion, columns } = this.config;
        
        const questionsPerColumn = Math.ceil(numQuestions / columns);
        const columnWidth = width / columns;
        const bubbleWidth = columnWidth / alternativesPerQuestion / 2.5;
        const bubbleHeight = height / (questionsPerColumn * alternativesPerQuestion * 1.5);
        
        this.bubbleGrid = [];
        
        for (let col = 0; col < columns; col++) {
            const baseX = col * columnWidth;
            
            for (let q = 0; q < questionsPerColumn; q++) {
                const questionNum = col * questionsPerColumn + q + 1;
                if (questionNum > numQuestions) break;
                
                const questionBubbles = [];
                const baseY = q * bubbleHeight * alternativesPerQuestion * 1.5;
                
                for (let alt = 0; alt < alternativesPerQuestion; alt++) {
                    const x = baseX + (columnWidth * 0.15) + (alt * bubbleWidth * 1.2);
                    const y = baseY + (q > 0 ? bubbleHeight * 0.3 : 0);
                    
                    questionBubbles.push({
                        question: questionNum,
                        alternative: this.alternativeLetters[alt] || String.fromCharCode(65 + alt),
                        x: Math.floor(x),
                        y: Math.floor(y),
                        w: Math.floor(bubbleWidth),
                        h: Math.floor(bubbleHeight * 0.6),
                        filled: false,
                        confidence: 0
                    });
                }
                
                this.bubbleGrid.push(questionBubbles);
            }
        }
        
        return this.bubbleGrid;
    }

    /**
     * Detecta marcação em uma bolha
     */
    detectBubbleMark(src, bubble) {
        if (!bubble || !src || src.empty()) {
            return { filled: false, confidence: 0, fillPercentage: 0 };
        }
        
        try {
            const x = Math.max(0, Math.floor(bubble.x));
            const y = Math.max(0, Math.floor(bubble.y));
            const w = Math.min(bubble.w, src.cols - x);
            const h = Math.min(bubble.h, src.rows - y);
            
            if (w <= 0 || h <= 0) {
                return { filled: false, confidence: 0, fillPercentage: 0 };
            }
            
            const roi = src.roi(new cv.Rect(x, y, w, h));
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
        } catch (e) {
            return { filled: false, confidence: 0, fillPercentage: 0 };
        }
    }

    /**
     * Processa imagem e retorna respostas
     */
    processImage(src) {
        if (!src || src.empty()) {
            console.error('Imagem inválida');
            return [];
        }

        // Gera grid se necessário
        if (!this.bubbleGrid || this.bubbleGrid.length === 0) {
            this.generateBubbleGrid(src.cols, src.rows);
        }
        
        const results = [];
        
        for (const questionBubbles of this.bubbleGrid) {
            const questionResults = {
                question: questionBubbles[0]?.question || 1,
                answers: [],
                selected: null,
                confidence: 0
            };
            
            let maxConfidence = 0;
            
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
                }
            }
            
            questionResults.confidence = maxConfidence;
            results.push(questionResults);
        }
        
        return results;
    }

    /**
     * Extrai respostas
     */
    extractAnswers(results) {
        return results.map(r => ({
            question: r.question,
            answer: r.selected || '',
            confidence: r.confidence
        }));
    }

    /**
     * Compara com gabarito
     */
    compareWithKey(answers, correctAnswers) {
        const correctStr = (correctAnswers || '').toString().toUpperCase();
        const results = {
            total: answers.length,
            correct: 0,
            wrong: 0,
            blank: 0,
            percentage: 0,
            details: []
        };
        
        for (let i = 0; i < answers.length; i++) {
            const userAnswer = (answers[i].answer || '').toUpperCase();
            const correct = correctStr[i] || '';
            
            const detail = {
                question: answers[i].question,
                userAnswer,
                correctAnswer: correct,
                status: !userAnswer ? 'blank' : (userAnswer === correct ? 'correct' : 'wrong')
            };
            
            if (!userAnswer) results.blank++;
            else if (userAnswer === correct) results.correct++;
            else results.wrong++;
            
            results.details.push(detail);
        }
        
        results.percentage = results.total > 0 ? 
            Math.round((results.correct / results.total) * 100) : 0;
        
        return results;
    }
}

window.OMRModule = OMRModule;
