const express = require('express');
const { body, validationResult } = require('express-validator');
const { evaluate, format } = require('mathjs');
const router = express.Router();

// Validações
const validateExpression = [
  body('expression')
    .notEmpty()
    .withMessage('Expressão é obrigatória')
    .isLength({ max: 200 })
    .withMessage('Expressão muito longa (máximo 200 caracteres)')
    .matches(/^[0-9+\-*/().\s√^!%sincostan log ln exp abs ceil floor round pi e ]+$/i)
    .withMessage('Expressão contém caracteres inválidos')
];

/**
 * @swagger
 * /api/calculate:
 *   post:
 *     summary: Calcula expressão matemática
 *     tags: [Calculator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalculationRequest'
 *           examples:
 *             basic:
 *               summary: Cálculo básico
 *               value:
 *                 expression: "2 + 3 * 4"
 *             scientific:
 *               summary: Função científica
 *               value:
 *                 expression: "sin(pi/2) + cos(0)"
 *             complex:
 *               summary: Cálculo complexo
 *               value:
 *                 expression: "sqrt(16) + log(100, 10)"
 *     responses:
 *       200:
 *         description: Cálculo realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: number
 *                   description: Resultado do cálculo
 *                 expression:
 *                   type: string
 *                   description: Expressão original
 *                 formatted:
 *                   type: string
 *                   description: Resultado formatado
 *                 type:
 *                   type: string
 *                   description: Tipo do resultado
 *             examples:
 *               success:
 *                 value:
 *                   result: 14
 *                   expression: "2 + 3 * 4"
 *                   formatted: "14"
 *                   type: "number"
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', validateExpression, (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { expression } = req.body;

    // Substituir operadores para Math.js
    let processedExpression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/√/g, 'sqrt')
      .toLowerCase();

    // Calcular usando Math.js
    const result = evaluate(processedExpression);
    
    // Verificar se o resultado é válido
    if (!isFinite(result)) {
      return res.status(400).json({
        error: 'Resultado inválido',
        details: 'O cálculo resultou em infinito ou NaN'
      });
    }

    // Formatear resultado
    const formatted = format(result, { precision: 10 });
    const type = typeof result;

    res.json({
      result: Number(result),
      expression: expression,
      formatted: formatted,
      type: type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no cálculo:', error);
    
    res.status(400).json({
      error: 'Erro no cálculo',
      details: error.message || 'Expressão matemática inválida'
    });
  }
});

/**
 * @swagger
 * /api/calculate/functions:
 *   get:
 *     summary: Lista funções matemáticas disponíveis
 *     tags: [Calculator]
 *     responses:
 *       200:
 *         description: Lista de funções disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 basic:
 *                   type: array
 *                   items:
 *                     type: string
 *                 trigonometric:
 *                   type: array
 *                   items:
 *                     type: string
 *                 logarithmic:
 *                   type: array
 *                   items:
 *                     type: string
 *                 constants:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/functions', (req, res) => {
  res.json({
    basic: [
      'sqrt(x) - Raiz quadrada',
      'abs(x) - Valor absoluto', 
      'ceil(x) - Arredondar para cima',
      'floor(x) - Arredondar para baixo',
      'round(x) - Arredondar',
      'pow(x, y) - Potenciação'
    ],
    trigonometric: [
      'sin(x) - Seno',
      'cos(x) - Cosseno', 
      'tan(x) - Tangente',
      'asin(x) - Arco seno',
      'acos(x) - Arco cosseno',
      'atan(x) - Arco tangente'
    ],
    logarithmic: [
      'log(x) - Logaritmo natural',
      'log10(x) - Logaritmo base 10',
      'log(x, base) - Logaritmo com base',
      'exp(x) - Exponencial'
    ],
    constants: [
      'pi - π (3.14159...)',
      'e - Número de Euler (2.71828...)'
    ],
    examples: [
      'sin(pi/2) = 1',
      'sqrt(16) = 4',
      'log10(100) = 2',
      'pow(2, 3) = 8'
    ]
  });
});

/**
 * @swagger
 * /api/calculate/validate:
 *   post:
 *     summary: Valida expressão matemática
 *     tags: [Calculator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expression]
 *             properties:
 *               expression:
 *                 type: string
 *                 description: Expressão para validar
 *     responses:
 *       200:
 *         description: Validação da expressão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/validate', (req, res) => {
  const { expression } = req.body;
  
  if (!expression) {
    return res.status(400).json({
      valid: false,
      message: 'Expressão é obrigatória'
    });
  }

  try {
    // Processar expressão
    let processedExpression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/√/g, 'sqrt')
      .toLowerCase();

    // Tentar avaliar
    const result = evaluate(processedExpression);
    
    res.json({
      valid: true,
      message: 'Expressão válida',
      preview: format(result, { precision: 4 }),
      suggestions: []
    });

  } catch (error) {
    const suggestions = [];
    
    // Analisar tipos de erro comuns
    if (error.message.includes('Unexpected')) {
      suggestions.push('Verifique parênteses e operadores');
    }
    if (error.message.includes('Undefined')) {
      suggestions.push('Função não reconhecida - veja /api/calculate/functions');
    }
    
    res.json({
      valid: false,
      message: 'Expressão inválida',
      error: error.message,
      suggestions: suggestions
    });
  }
});

module.exports = router;