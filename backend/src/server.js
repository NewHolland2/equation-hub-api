const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { evaluate, format } = require('mathjs');
const net = require('net');
require('dotenv').config();

const app = express();

// Função para encontrar porta livre
const findFreePort = (startPort) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, (err) => {
      if (err) {
        console.log(`Porta ${startPort} em uso, tentando ${startPort + 1}...`);
        server.close();
        findFreePort(startPort + 1).then(resolve).catch(reject);
      } else {
        const port = server.address().port;
        server.close(() => resolve(port));
      }
    });
  });
};

// Middleware de segurança
app.use(helmet());
app.use(compression());

// CORS configurado
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://equation-hub.vercel.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.'
  }
});
app.use(limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Swagger/OpenAPI setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EquationHub API',
      version: '1.0.0',
      description: 'API completa para cálculos matemáticos e Machine Learning'
    },
    servers: [{
      url: process.env.NODE_ENV === 'production' 
        ? 'https://equation-hub-api.herokuapp.com'
        : 'http://localhost:PORT_PLACEHOLDER',
      description: process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'
    }]
  },
  apis: ['./src/server.js']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EquationHub API Documentation'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    port: res.locals.port || 'unknown'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🧮 Bem-vindo à EquationHub API!',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      calculate: '/api/calculate',
      quadratic: '/api/quadratic',
      stats: '/api/stats'
    },
    github: 'https://github.com/seu-usuario/equation-hub-platform'
  });
});

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
 *             type: object
 *             required: [expression]
 *             properties:
 *               expression:
 *                 type: string
 *                 description: Expressão matemática
 *                 example: "2 + 3 * 4"
 *     responses:
 *       200:
 *         description: Cálculo realizado com sucesso
 */
app.post('/api/calculate', (req, res) => {
  try {
    const { expression } = req.body;

    if (!expression) {
      return res.status(400).json({
        error: 'Expressão é obrigatória'
      });
    }

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

    res.json({
      result: Number(result),
      expression: expression,
      formatted: formatted,
      type: typeof result,
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
 * /api/quadratic:
 *   post:
 *     summary: Resolve equação quadrática
 *     tags: [Equations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [a, b, c]
 *             properties:
 *               a: {type: number, example: 1}
 *               b: {type: number, example: -5}
 *               c: {type: number, example: 6}
 *     responses:
 *       200:
 *         description: Equação resolvida com sucesso
 */
app.post('/api/quadratic', (req, res) => {
  try {
    const { a, b, c } = req.body;
    
    // Validações básicas
    if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number') {
      return res.status(400).json({
        error: 'Coeficientes devem ser números'
      });
    }

    if (a === 0) {
      return res.status(400).json({
        error: 'Coeficiente "a" não pode ser zero'
      });
    }

    // Calcular discriminante
    const discriminant = b * b - 4 * a * c;
    
    // Formatar equação
    const equation = formatQuadraticEquation(a, b, c);
    
    let solutions = [];
    let type = '';

    if (discriminant > 0) {
      // Duas soluções reais
      const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      solutions = [x1, x2].sort((a, b) => a - b);
      type = 'two_real';
    } else if (discriminant === 0) {
      // Uma solução real
      const x = -b / (2 * a);
      solutions = [x];
      type = 'one_real';
    } else {
      // Soluções complexas
      const realPart = -b / (2 * a);
      const imagPart = Math.sqrt(-discriminant) / (2 * a);
      solutions = [
        { real: realPart, imag: imagPart },
        { real: realPart, imag: -imagPart }
      ];
      type = 'complex';
    }

    res.json({
      equation,
      coefficients: { a, b, c },
      discriminant,
      solutions,
      type,
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
 * /api/stats:
 *   post:
 *     summary: Calcula estatísticas básicas
 *     tags: [Statistics]
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
 *                 example: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Estatísticas calculadas
 */
app.post('/api/stats', (req, res) => {
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

    // Calcular estatísticas básicas
    const sortedValues = [...numericValues].sort((a, b) => a - b);
    const n = numericValues.length;
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const median = n % 2 === 0 
      ? (sortedValues[n/2 - 1] + sortedValues[n/2]) / 2
      : sortedValues[Math.floor(n/2)];
    
    // Variância e desvio padrão
    const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    const stats = {
      count: n,
      sum,
      mean,
      median,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      range: Math.max(...numericValues) - Math.min(...numericValues),
      variance,
      standardDeviation
    };

    res.json({
      original_data: values,
      statistics: stats,
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

// Função auxiliar para formatar equação quadrática
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

// Middleware de erro 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `Rota ${req.originalUrl} não existe`,
    availableEndpoints: [
      '/health',
      '/api/calculate', 
      '/api/quadratic',
      '/api/stats',
      '/api-docs'
    ]
  });
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro capturado:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor com porta automática
const startServer = async () => {
  try {
    const preferredPort = process.env.PORT || 5000;
    const port = await findFreePort(parseInt(preferredPort));
    
    // Atualizar swagger com a porta correta
    const updatedSpecs = { ...specs };
    if (updatedSpecs.servers && updatedSpecs.servers[0]) {
      updatedSpecs.servers[0].url = updatedSpecs.servers[0].url.replace('PORT_PLACEHOLDER', port);
    }
    
    app.listen(port, () => {
      console.log(`🚀 Servidor rodando na porta ${port}`);
      console.log(`📚 Documentação: http://localhost:${port}/api-docs`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`🧮 API Base: http://localhost:${port}`);
      
      if (port !== parseInt(preferredPort)) {
        console.log(`⚠️  Porta ${preferredPort} estava em uso, usando ${port} em vez disso`);
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;