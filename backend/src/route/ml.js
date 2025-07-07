const express = require('express');
const { body, validationResult } = require('express-validator');
const { mean, standardDeviation, variance, median, mode, min, max } = require('simple-statistics');
const router = express.Router();

// Validações para dados de ML
const validateDataset = [
  body('data')
    .isArray({ min: 2, max: 1000 })
    .withMessage('Dataset deve ser um array com 2-1000 pontos'),
  body('data.*.x')
    .isNumeric()
    .withMessage('Valores de X devem ser numéricos'),
  body('data.*.y')
    .isNumeric()
    .withMessage('Valores de Y devem ser numéricos')
];

/**
 * @swagger
 * /api/ml/regression/linear:
 *   post:
 *     summary: Calcula regressão linear simples
 *     tags: [Machine Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     x: {type: number}
 *                     y: {type: number}
 *                 example: [{"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 6}]
 *     responses:
 *       200:
 *         description: Regressão linear calculada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 equation:
 *                   type: string
 *                   description: Equação da reta (y = mx + b)
 *                 slope:
 *                   type: number
 *                   description: Coeficiente angular (m)
 *                 intercept:
 *                   type: number
 *                   description: Coeficiente linear (b)
 *                 correlation:
 *                   type: number
 *                   description: Coeficiente de correlação (r)
 *                 r_squared:
 *                   type: number
 *                   description: Coeficiente de determinação (R²)
 */
router.post('/regression/linear', validateDataset, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { data } = req.body;
    
    // Extrair arrays X e Y
    const xValues = data.map(point => point.x);
    const yValues = data.map(point => point.y);
    
    // Calcular estatísticas básicas
    const n = data.length;
    const meanX = mean(xValues);
    const meanY = mean(yValues);
    
    // Calcular coeficientes da regressão linear
    const numerator = data.reduce((sum, point) => 
      sum + (point.x - meanX) * (point.y - meanY), 0);
    const denominator = data.reduce((sum, point) => 
      sum + Math.pow(point.x - meanX, 2), 0);
    
    if (denominator === 0) {
      return res.status(400).json({
        error: 'Não é possível calcular regressão',
        details: 'Todos os valores de X são iguais'
      });
    }
    
    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calcular correlação
    const correlation = calculateCorrelation(xValues, yValues);
    const rSquared = correlation * correlation;
    
    // Gerar predições
    const predictions = data.map(point => ({
      x: point.x,
      y_actual: point.y,
      y_predicted: slope * point.x + intercept,
      residual: point.y - (slope * point.x + intercept)
    }));
    
    // Calcular métricas de erro
    const mse = mean(predictions.map(p => p.residual * p.residual));
    const rmse = Math.sqrt(mse);
    const mae = mean(predictions.map(p => Math.abs(p.residual)));
    
    // Formatear equação
    const equation = formatLinearEquation(slope, intercept);
    
    res.json({
      equation,
      coefficients: {
        slope,
        intercept
      },
      metrics: {
        correlation,
        r_squared: rSquared,
        mse,
        rmse,
        mae
      },
      predictions,
      summary: {
        dataPoints: n,
        meanX,
        meanY,
        equation
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na regressão linear:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/ml/stats/descriptive:
 *   post:
 *     summary: Calcula estatísticas descritivas
 *     tags: [Machine Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [values]
 *             properties:
 *               values:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 *     responses:
 *       200:
 *         description: Estatísticas descritivas calculadas
 */
router.post('/stats/descriptive', (req, res) => {
  try {
    const { values } = req.body;
    
    if (!Array.isArray(values) || values.length === 0) {
      return res.status(400).json({
        error: 'Array de valores é obrigatório'
      });
    }

    // Verificar se todos são números
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (numericValues.length !== values.length) {
      return res.status(400).json({
        error: 'Todos os valores devem ser números válidos'
      });
    }

    const sortedValues = [...numericValues].sort((a, b) => a - b);
    
    // Calcular estatísticas
    const stats = {
      count: numericValues.length,
      mean: mean(numericValues),
      median: median(numericValues),
      mode: mode(numericValues),
      min: min(numericValues),
      max: max(numericValues),
      range: max(numericValues) - min(numericValues),
      variance: variance(numericValues),
      standardDeviation: standardDeviation(numericValues),
      quartiles: calculateQuartiles(sortedValues),
      outliers: detectOutliers(sortedValues)
    };

    res.json({
      original_data: values,
      statistics: stats,
      distribution: {
        skewness: calculateSkewness(numericValues, stats.mean, stats.standardDeviation),
        kurtosis: calculateKurtosis(numericValues, stats.mean, stats.standardDeviation)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no cálculo de estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/ml/normalize:
 *   post:
 *     summary: Normaliza dados usando diferentes métodos
 *     tags: [Machine Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data, method]
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: number
 *               method:
 *                 type: string
 *                 enum: [zscore, minmax, robust]
 *                 description: Método de normalização
 *           examples:
 *             zscore:
 *               summary: Z-Score normalization
 *               value:
 *                 data: [1, 2, 3, 4, 5]
 *                 method: "zscore"
 *             minmax:
 *               summary: Min-Max normalization
 *               value:
 *                 data: [1, 2, 3, 4, 5]
 *                 method: "minmax"
 */
router.post('/normalize', (req, res) => {
  try {
    const { data, method = 'zscore' } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        error: 'Array de dados é obrigatório'
      });
    }

    const numericData = data.filter(v => typeof v === 'number' && !isNaN(v));
    if (numericData.length !== data.length) {
      return res.status(400).json({
        error: 'Todos os valores devem ser números válidos'
      });
    }

    let normalizedData;
    let parameters = {};

    switch (method) {
      case 'zscore':
        const meanVal = mean(numericData);
        const stdVal = standardDeviation(numericData);
        normalizedData = numericData.map(x => (x - meanVal) / stdVal);
        parameters = { mean: meanVal, std: stdVal };
        break;

      case 'minmax':
        const minVal = min(numericData);
        const maxVal = max(numericData);
        const range = maxVal - minVal;
        normalizedData = numericData.map(x => (x - minVal) / range);
        parameters = { min: minVal, max: maxVal, range };
        break;

      case 'robust':
        const medianVal = median(numericData);
        const sortedData = [...numericData].sort((a, b) => a - b);
        const q1 = calculateQuartiles(sortedData).q1;
        const q3 = calculateQuartiles(sortedData).q3;
        const iqr = q3 - q1;
        normalizedData = numericData.map(x => (x - medianVal) / iqr);
        parameters = { median: medianVal, q1, q3, iqr };
        break;

      default:
        return res.status(400).json({
          error: 'Método de normalização inválido',
          available_methods: ['zscore', 'minmax', 'robust']
        });
    }

    res.json({
      original_data: data,
      normalized_data: normalizedData,
      method,
      parameters,
      statistics: {
        original: {
          mean: mean(numericData),
          std: standardDeviation(numericData),
          min: min(numericData),
          max: max(numericData)
        },
        normalized: {
          mean: mean(normalizedData),
          std: standardDeviation(normalizedData),
          min: min(normalizedData),
          max: max(normalizedData)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na normalização:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/ml/correlation:
 *   post:
 *     summary: Calcula matriz de correlação entre variáveis
 *     tags: [Machine Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [datasets]
 *             properties:
 *               datasets:
 *                 type: object
 *                 additionalProperties:
 *                   type: array
 *                   items:
 *                     type: number
 *               method:
 *                 type: string
 *                 enum: [pearson, spearman]
 *                 default: pearson
 *           examples:
 *             basic:
 *               summary: Correlação entre duas variáveis
 *               value:
 *                 datasets:
 *                   height: [170, 175, 180, 165, 185]
 *                   weight: [65, 70, 80, 60, 85]
 *                 method: "pearson"
 */
router.post('/correlation', (req, res) => {
  try {
    const { datasets, method = 'pearson' } = req.body;
    
    if (!datasets || typeof datasets !== 'object') {
      return res.status(400).json({
        error: 'Datasets são obrigatórios'
      });
    }

    const variables = Object.keys(datasets);
    if (variables.length < 2) {
      return res.status(400).json({
        error: 'Pelo menos duas variáveis são necessárias'
      });
    }

    // Verificar se todos os arrays têm o mesmo tamanho
    const lengths = variables.map(v => datasets[v].length);
    if (!lengths.every(l => l === lengths[0])) {
      return res.status(400).json({
        error: 'Todas as variáveis devem ter o mesmo número de observações'
      });
    }

    // Calcular matriz de correlação
    const correlationMatrix = {};
    const pValues = {};
    
    for (let i = 0; i < variables.length; i++) {
      const var1 = variables[i];
      correlationMatrix[var1] = {};
      pValues[var1] = {};
      
      for (let j = 0; j < variables.length; j++) {
        const var2 = variables[j];
        
        if (i === j) {
          correlationMatrix[var1][var2] = 1.0;
          pValues[var1][var2] = 0.0;
        } else {
          const corr = calculateCorrelation(datasets[var1], datasets[var2]);
          correlationMatrix[var1][var2] = corr;
          
          // Calcular p-value aproximado
          const n = datasets[var1].length;
          const t = corr * Math.sqrt((n - 2) / (1 - corr * corr));
          pValues[var1][var2] = 2 * (1 - tDistribution(Math.abs(t), n - 2));
        }
      }
    }

    res.json({
      correlation_matrix: correlationMatrix,
      p_values: pValues,
      method,
      variables,
      sample_size: lengths[0],
      interpretation: interpretCorrelations(correlationMatrix),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no cálculo de correlação:', error);
    res.status(500).json({
      error: 'Erro interno',
      details: error.message
    });
  }
});

// Funções auxiliares
function calculateCorrelation(x, y) {
  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  
  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denomX = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);
  const denomY = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  
  return numerator / Math.sqrt(denomX * denomY);
}

function calculateQuartiles(sortedArray) {
  const n = sortedArray.length;
  
  const q1Index = Math.floor(n * 0.25);
  const q2Index = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);
  
  return {
    q1: sortedArray[q1Index],
    q2: sortedArray[q2Index], // mediana
    q3: sortedArray[q3Index]
  };
}

function detectOutliers(sortedArray) {
  const quartiles = calculateQuartiles(sortedArray);
  const iqr = quartiles.q3 - quartiles.q1;
  const lowerBound = quartiles.q1 - 1.5 * iqr;
  const upperBound = quartiles.q3 + 1.5 * iqr;
  
  return sortedArray.filter(value => value < lowerBound || value > upperBound);
}

function calculateSkewness(data, meanVal, stdVal) {
  const n = data.length;
  const sum = data.reduce((acc, value) => {
    return acc + Math.pow((value - meanVal) / stdVal, 3);
  }, 0);
  
  return (n / ((n - 1) * (n - 2))) * sum;
}

function calculateKurtosis(data, meanVal, stdVal) {
  const n = data.length;
  const sum = data.reduce((acc, value) => {
    return acc + Math.pow((value - meanVal) / stdVal, 4);
  }, 0);
  
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

function formatLinearEquation(slope, intercept) {
  const slopeStr = slope.toFixed(4);
  const interceptStr = Math.abs(intercept).toFixed(4);
  const sign = intercept >= 0 ? '+' : '-';
  
  return `y = ${slopeStr}x ${sign} ${interceptStr}`;
}

function tDistribution(t, df) {
  // Aproximação da distribuição t de Student
  return 0.5; // Simplificado para este exemplo
}

function interpretCorrelations(matrix) {
  const interpretations = {};
  const variables = Object.keys(matrix);
  
  for (let i = 0; i < variables.length; i++) {
    for (let j = i + 1; j < variables.length; j++) {
      const var1 = variables[i];
      const var2 = variables[j];
      const corr = matrix[var1][var2];
      
      let strength = '';
      if (Math.abs(corr) < 0.3) strength = 'fraca';
      else if (Math.abs(corr) < 0.7) strength = 'moderada';
      else strength = 'forte';
      
      const direction = corr > 0 ? 'positiva' : 'negativa';
      
      interpretations[`${var1}_${var2}`] = {
        correlation: corr,
        strength,
        direction,
        description: `Correlação ${strength} ${direction} entre ${var1} e ${var2}`
      };
    }
  }
  
  return interpretations;
}

module.exports = router;