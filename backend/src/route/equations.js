const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validações para equação quadrática
const validateQuadratic = [
  body('a')
    .isNumeric()
    .withMessage('Coeficiente "a" deve ser um número')
    .custom(value => {
      if (value === 0) {
        throw new Error('Coeficiente "a" não pode ser zero (não seria equação quadrática)');
      }
      return true;
    }),
  body('b')
    .isNumeric()
    .withMessage('Coeficiente "b" deve ser um número'),
  body('c')
    .isNumeric()
    .withMessage('Coeficiente "c" deve ser um número')
];

// Validações para equação linear
const validateLinear = [
  body('a')
    .isNumeric()
    .withMessage('Coeficiente "a" deve ser um número')
    .custom(value => {
      if (value === 0) {
        throw new Error('Coeficiente "a" não pode ser zero');
      }
      return true;
    }),
  body('b')
    .isNumeric()
    .withMessage('Coeficiente "b" deve ser um número')
];

/**
 * @swagger
 * /api/equations/quadratic:
 *   post:
 *     summary: Resolve equação quadrática
 *     tags: [Equations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuadraticRequest'
 *           examples:
 *             twoSolutions:
 *               summary: Duas soluções reais
 *               value:
 *                 a: 1
 *                 b: -5
 *                 c: 6
 *             oneSolution:
 *               summary: Uma solução (discriminante = 0)
 *               value:
 *                 a: 1
 *                 b: -4
 *                 c: 4
 *             noRealSolutions:
 *               summary: Sem soluções reais
 *               value:
 *                 a: 1
 *                 b: 1
 *                 c: 1
 *     responses:
 *       200:
 *         description: Equação resolvida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 equation:
 *                   type: string
 *                   description: Equação formatada
 *                 discriminant:
 *                   type: number
 *                   description: Valor do discriminante
 *                 solutions:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: Soluções da equação
 *                 type:
 *                   type: string
 *                   enum: [two_real, one_real, no_real, complex]
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Passos da resolução
 *             examples:
 *               twoSolutions:
 *                 value:
 *                   equation: "x² - 5x + 6 = 0"
 *                   discriminant: 1
 *                   solutions: [3, 2]
 *                   type: "two_real"
 *                   steps: ["Δ = b² - 4ac", "Δ = 25 - 24 = 1", "x = (5 ± 1) / 2"]
 */
router.post('/quadratic', validateQuadratic, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { a, b, c } = req.body;
    
    // Calcular discriminante
    const discriminant = b * b - 4 * a * c;
    
    // Formatar equação
    const equation = formatQuadraticEquation(a, b, c);
    
    // Passos da resolução
    const steps = [
      `Equação: ${equation}`,
      `Discriminante: Δ = b² - 4ac`,
      `Δ = (${b})² - 4(${a})(${c})`,
      `Δ = ${b * b} - ${4 * a * c} = ${discriminant}`
    ];

    let solutions = [];
    let type = '';

    if (discriminant > 0) {
      // Duas soluções reais
      const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      solutions = [x1, x2].sort((a, b) => a - b);
      type = 'two_real';
      steps.push(`x₁ = (${-b} + √${discriminant}) / ${2 * a} = ${x1.toFixed(4)}`);
      steps.push(`x₂ = (${-b} - √${discriminant}) / ${2 * a} = ${x2.toFixed(4)}`);
    } else if (discriminant === 0) {
      // Uma solução real
      const x = -b / (2 * a);
      solutions = [x];
      type = 'one_real';
      steps.push(`x = ${-b} / ${2 * a} = ${x.toFixed(4)}`);
    } else {
      // Soluções complexas
      const realPart = -b / (2 * a);
      const imagPart = Math.sqrt(-discriminant) / (2 * a);
      solutions = [
        { real: realPart, imag: imagPart },
        { real: realPart, imag: -imagPart }
      ];
      type = 'complex';
      steps.push(`x₁ = ${realPart.toFixed(4)} + ${imagPart.toFixed(4)}i`);
      steps.push(`x₂ = ${realPart.toFixed(4)} - ${imagPart.toFixed(4)}i`);
    }

    // Verificação das soluções (para soluções reais)
    const verification = type !== 'complex' ? verifySolutions(a, b, c, solutions) : null;

    res.json({
      equation,
      coefficients: { a, b, c },
      discriminant,
      solutions,
      type,
      steps,
      verification,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao resolver equação quadrática:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/equations/linear:
 *   post:
 *     summary: Resolve equação linear (ax + b = 0)
 *     tags: [Equations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [a, b]
 *             properties:
 *               a:
 *                 type: number
 *                 description: Coeficiente de x
 *               b:
 *                 type: number
 *                 description: Termo independente
 *           examples:
 *             basic:
 *               summary: Equação linear básica
 *               value:
 *                 a: 2
 *                 b: -6
 *     responses:
 *       200:
 *         description: Equação linear resolvida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 equation:
 *                   type: string
 *                 solution:
 *                   type: number
 *                 steps:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/linear', validateLinear, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { a, b } = req.body;
    
    const equation = formatLinearEquation(a, b);
    const solution = -b / a;
    
    const steps = [
      `Equação: ${equation}`,
      `Isolando x: x = -b/a`,
      `x = -(${b})/(${a})`,
      `x = ${solution.toFixed(4)}`
    ];

    const verification = a * solution + b;

    res.json({
      equation,
      coefficients: { a, b },
      solution,
      steps,
      verification: Math.abs(verification) < 1e-10 ? 0 : verification,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao resolver equação linear:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/equations/system:
 *   post:
 *     summary: Resolve sistema 2x2 de equações lineares
 *     tags: [Equations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eq1, eq2]
 *             properties:
 *               eq1:
 *                 type: object
 *                 properties:
 *                   a: {type: number}
 *                   b: {type: number}
 *                   c: {type: number}
 *               eq2:
 *                 type: object
 *                 properties:
 *                   a: {type: number}
 *                   b: {type: number}
 *                   c: {type: number}
 *           examples:
 *             basic:
 *               summary: Sistema básico 2x2
 *               value:
 *                 eq1: {a: 2, b: 3, c: 7}
 *                 eq2: {a: 1, b: -1, c: 1}
 *     responses:
 *       200:
 *         description: Sistema resolvido
 */
router.post('/system', (req, res) => {
  try {
    const { eq1, eq2 } = req.body;
    
    // Validação básica
    if (!eq1 || !eq2) {
      return res.status(400).json({
        error: 'Duas equações são necessárias'
      });
    }

    const { a: a1, b: b1, c: c1 } = eq1;
    const { a: a2, b: b2, c: c2 } = eq2;

    // Método de Cramer
    const det = a1 * b2 - a2 * b1;
    
    if (Math.abs(det) < 1e-10) {
      return res.status(400).json({
        error: 'Sistema indeterminado ou impossível',
        details: 'Determinante igual a zero'
      });
    }

    const x = (c1 * b2 - c2 * b1) / det;
    const y = (a1 * c2 - a2 * c1) / det;

    const equations = [
      `${formatCoeff(a1)}x ${formatTerm(b1)}y = ${c1}`,
      `${formatCoeff(a2)}x ${formatTerm(b2)}y = ${c2}`
    ];

    const steps = [
      `Sistema: ${equations.join(', ')}`,
      `Determinante: D = ${a1}×${b2} - ${a2}×${b1} = ${det}`,
      `x = (${c1}×${b2} - ${c2}×${b1}) / ${det} = ${x.toFixed(4)}`,
      `y = (${a1}×${c2} - ${a2}×${c1}) / ${det} = ${y.toFixed(4)}`
    ];

    res.json({
      equations,
      solution: { x, y },
      determinant: det,
      steps,
      verification: {
        eq1: a1 * x + b1 * y,
        eq2: a2 * x + b2 * y
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao resolver sistema:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/equations/parse:
 *   post:
 *     summary: Analisa e extrai coeficientes de equação em texto
 *     tags: [Equations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equation]
 *             properties:
 *               equation:
 *                 type: string
 *                 description: Equação em formato texto
 *                 example: "x² + 5x - 6 = 0"
 *     responses:
 *       200:
 *         description: Coeficientes extraídos
 */
router.post('/parse', (req, res) => {
  try {
    const { equation } = req.body;
    
    if (!equation) {
      return res.status(400).json({
        error: 'Equação é obrigatória'
      });
    }

    const parsed = parseEquation(equation);
    
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Formato de equação inválido',
        details: parsed.error
      });
    }

    res.json({
      original: equation,
      type: parsed.type,
      coefficients: parsed.coefficients,
      formatted: parsed.formatted,
      suggestions: parsed.suggestions || []
    });

  } catch (error) {
    console.error('Erro ao analisar equação:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

// Funções auxiliares
function formatQuadraticEquation(a, b, c) {
  let equation = '';
  
  // Termo a
  if (a === 1) equation += 'x²';
  else if (a === -1) equation += '-x²';
  else equation += `${a}x²`;
  
  // Termo b
  if (b > 0) equation += ` + ${b === 1 ? '' : b}x`;
  else if (b < 0) equation += ` - ${b === -1 ? '' : Math.abs(b)}x`;
  
  // Termo c
  if (c > 0) equation += ` + ${c}`;
  else if (c < 0) equation += ` - ${Math.abs(c)}`;
  
  return equation + ' = 0';
}

function formatLinearEquation(a, b) {
  let equation = '';
  
  if (a === 1) equation += 'x';
  else if (a === -1) equation += '-x';
  else equation += `${a}x`;
  
  if (b > 0) equation += ` + ${b}`;
  else if (b < 0) equation += ` - ${Math.abs(b)}`;
  
  return equation + ' = 0';
}

function formatCoeff(coeff) {
  if (coeff === 1) return '';
  if (coeff === -1) return '-';
  return coeff.toString();
}

function formatTerm(coeff) {
  if (coeff === 0) return '';
  if (coeff > 0) return `+ ${coeff === 1 ? '' : coeff}`;
  return `- ${coeff === -1 ? '' : Math.abs(coeff)}`;
}

function verifySolutions(a, b, c, solutions) {
  return solutions.map(x => {
    const result = a * x * x + b * x + c;
    return {
      x: x,
      verification: Math.abs(result) < 1e-10 ? 0 : result,
      isValid: Math.abs(result) < 1e-6
    };
  });
}

function parseEquation(equation) {
  // Remove espaços e converte para minúsculo
  let eq = equation.replace(/\s/g, '').toLowerCase();
  
  // Padrões para diferentes tipos de equação
  const patterns = {
    quadratic: [
      /([+-]?\d*)\*?x\^?2([+-]\d*)\*?x([+-]\d+)=0/,
      /([+-]?\d*)\*?x²([+-]\d*)\*?x([+-]\d+)=0/,
      /([+-]?\d*)\*?x\^?2([+-]\d+)=0/,
      /([+-]?\d*)\*?x²([+-]\d+)=0/
    ],
    linear: [
      /([+-]?\d*)\*?x([+-]\d+)=0/
    ]
  };

  // Tentar match com equação quadrática
  for (let pattern of patterns.quadratic) {
    const match = eq.match(pattern);
    if (match) {
      const a = parseCoeff(match[1]) || 1;
      const b = match[2] ? parseCoeff(match[2]) : 0;
      const c = match[3] ? parseCoeff(match[3]) : parseCoeff(match[2]);
      
      return {
        success: true,
        type: 'quadratic',
        coefficients: { a, b, c },
        formatted: formatQuadraticEquation(a, b, c)
      };
    }
  }

  // Tentar match com equação linear
  for (let pattern of patterns.linear) {
    const match = eq.match(pattern);
    if (match) {
      const a = parseCoeff(match[1]) || 1;
      const b = parseCoeff(match[2]) || 0;
      
      return {
        success: true,
        type: 'linear',
        coefficients: { a, b },
        formatted: formatLinearEquation(a, b)
      };
    }
  }

  return {
    success: false,
    error: 'Formato não reconhecido',
    suggestions: [
      'x² + 5x + 6 = 0',
      '2x² - 3x + 1 = 0',
      'x² - 4 = 0',
      '3x + 6 = 0'
    ]
  };
}

function parseCoeff(str) {
  if (!str || str === '+') return 1;
  if (str === '-') return -1;
  return parseInt(str);
}

module.exports = router;