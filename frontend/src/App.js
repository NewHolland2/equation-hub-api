import React, { useState, useEffect } from 'react';
import { Calculator, Target, Brain, Code, Github, Star, Delete, Menu, X } from 'lucide-react';

const EquationHub = () => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [equation, setEquation] = useState('');
  const [equationResult, setEquationResult] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:5001'); // Porta padrão

  // Detectar dispositivo mobile e descobrir porta da API
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Tentar descobrir a porta da API
    const tryApiPorts = async () => {
      const ports = [5000, 5001, 5002, 8000];
      for (const port of ports) {
        try {
          const response = await fetch(`http://localhost:${port}/health`);
          if (response.ok) {
            setApiUrl(`http://localhost:${port}`);
            console.log(`🔗 API encontrada na porta ${port}`);
            break;
          }
        } catch (error) {
          // Porta não disponível, tentar próxima
        }
      }
    };
    
    tryApiPorts();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Função para chamar API
  const callAPI = async (endpoint, data) => {
    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro na API:', error);
      throw error;
    }
  };

  // Calculadora melhorada
  const inputNumber = (num) => {
    if (waitingForOperand) {
      setCalculatorDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setCalculatorDisplay(calculatorDisplay === '0' ? String(num) : calculatorDisplay + num);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setCalculatorDisplay('0.');
      setWaitingForOperand(false);
    } else if (calculatorDisplay.indexOf('.') === -1) {
      setCalculatorDisplay(calculatorDisplay + '.');
    }
  };

  const clear = () => {
    setCalculatorDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(calculatorDisplay);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setCalculatorDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const handleCalculate = async () => {
    try {
      // Se tem operação pendente, resolver localmente
      if (previousValue !== null && operation) {
        const inputValue = parseFloat(calculatorDisplay);
        const newValue = calculate(previousValue, inputValue, operation);
        setCalculatorDisplay(String(newValue));
        setPreviousValue(null);
        setOperation(null);
        setWaitingForOperand(true);
        return;
      }

      // Senão, usar API para validar/calcular
      const result = await callAPI('/api/calculate', {
        expression: calculatorDisplay
      });
      
      setCalculatorDisplay(result.formatted);
    } catch (error) {
      setCalculatorDisplay('Erro');
    }
  };

  // Solucionador de equações melhorado
  const solveQuadratic = async () => {
    if (!equation.trim()) {
      setEquationResult('Por favor, digite uma equação');
      return;
    }

    try {
      // Tentar extrair coeficientes da equação
      const match = equation.match(/([+-]?\s*\d*\.?\d*)\s*x²?\s*([+-]\s*\d*\.?\d*)\s*x\s*([+-]\s*\d*\.?\d*)\s*=\s*0/i);
      
      if (!match) {
        setEquationResult('Formato inválido. Use: ax² + bx + c = 0');
        return;
      }

      const a = parseFloat(match[1].replace(/\s/g, '')) || 1;
      const b = parseFloat(match[2].replace(/\s/g, '')) || 0;
      const c = parseFloat(match[3].replace(/\s/g, '')) || 0;

      const result = await callAPI('/api/quadratic', { a, b, c });
      
      if (result.type === 'two_real') {
        setEquationResult(`Duas soluções: x₁ = ${result.solutions[0].toFixed(4)}, x₂ = ${result.solutions[1].toFixed(4)}`);
      } else if (result.type === 'one_real') {
        setEquationResult(`Uma solução: x = ${result.solutions[0].toFixed(4)}`);
      } else {
        setEquationResult('Soluções complexas');
      }
    } catch (error) {
      setEquationResult('Erro ao resolver equação. Verifique o formato.');
    }
  };

  // Dados ML melhorados
  const generateMLExample = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      x: i + 1,
      y: Math.round((2.5 * (i + 1) + Math.random() * 4 - 2) * 100) / 100
    }));
  };

  const mlData = generateMLExample();

  // Estatísticas ML
  const meanX = mlData.reduce((sum, p) => sum + p.x, 0) / mlData.length;
  const meanY = mlData.reduce((sum, p) => sum + p.y, 0) / mlData.length;
  const correlation = calculateCorrelation(mlData);

  function calculateCorrelation(data) {
    const n = data.length;
    const sumX = data.reduce((sum, p) => sum + p.x, 0);
    const sumY = data.reduce((sum, p) => sum + p.y, 0);
    const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = data.reduce((sum, p) => sum + p.y * p.y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  const calculatorButtons = [
    ['C', '÷', '×', '⌫'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', ''],
    ['0', '.', '', '=']
  ];

  const getButtonStyle = (btn) => {
    const baseStyle = {
      height: isMobile ? '50px' : '56px',
      borderRadius: '12px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: isMobile ? '16px' : '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'manipulation'
    };

    if (btn === '=') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
      };
    } else if (['÷', '×', '-', '+'].includes(btn)) {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
      };
    } else if (btn === 'C') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
      };
    } else if (btn === '⌫') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        color: 'white',
        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
      };
    } else {
      return {
        ...baseStyle,
        background: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      };
    }
  };

  const handleButtonClick = (btn) => {
    if (btn >= '0' && btn <= '9') {
      inputNumber(btn);
    } else if (btn === '.') {
      inputDot();
    } else if (btn === 'C') {
      clear();
    } else if (btn === '⌫') {
      if (calculatorDisplay.length > 1) {
        setCalculatorDisplay(calculatorDisplay.slice(0, -1));
      } else {
        setCalculatorDisplay('0');
      }
    } else if (btn === '=') {
      handleCalculate();
    } else if (['+', '-', '×', '÷'].includes(btn)) {
      performOperation(btn);
    }
  };

  const navItems = [
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'equations', label: 'Equações', icon: Target },
    { id: 'ml', label: 'ML Tools', icon: Brain },
    { id: 'api', label: 'API Docs', icon: Code }
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f172a 100%)',
      minHeight: '100vh'
    }}>
      {/* Header responsivo */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: isMobile ? '0 16px' : '0 24px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: isMobile ? '16px 0' : '20px 0' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
              <div style={{ 
                width: isMobile ? '40px' : '48px', 
                height: isMobile ? '40px' : '48px', 
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
              }}>
                <Calculator size={isMobile ? 20 : 28} color="white" />
              </div>
              <div>
                <h1 style={{ 
                  fontSize: isMobile ? '20px' : '28px', 
                  fontWeight: '800', 
                  color: 'white', 
                  margin: 0, 
                  letterSpacing: '-0.5px' 
                }}>
                  EquationHub
                </h1>
                {!isMobile && (
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, fontWeight: '500' }}>
                    Hub de Equações para Desenvolvedores
                  </p>
                )}
              </div>
            </div>
            
            {isMobile ? (
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  fontWeight: '500'
                }}>
                  <Github size={18} />
                  <span>GitHub</span>
                </button>
                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)'
                }}>
                  <Star size={18} color="white" />
                  <span style={{ color: 'white' }}>Star</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Menu mobile */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          zIndex: 99,
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: activeTab === id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: activeTab === id ? '#60a5fa' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation desktop */}
      {!isMobile && (
        <nav style={{
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 20px',
                    background: activeTab === id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '12px 12px 0 0',
                    color: activeTab === id ? '#60a5fa' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: '500',
                    borderBottom: activeTab === id ? '2px solid #3b82f6' : '2px solid transparent'
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: isMobile ? '20px 16px' : '40px 24px' 
      }}>
        {activeTab === 'calculator' && (
          <div style={{ maxWidth: isMobile ? '100%' : '420px', margin: '0 auto' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: isMobile ? '20px' : '32px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{ 
                fontSize: isMobile ? '20px' : '24px', 
                fontWeight: '700', 
                color: 'white', 
                marginBottom: isMobile ? '16px' : '24px', 
                textAlign: 'center' 
              }}>
                Calculadora Científica
              </h2>
              
              {/* Display melhorado */}
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.6)', 
                borderRadius: '16px', 
                padding: isMobile ? '16px' : '24px', 
                marginBottom: isMobile ? '16px' : '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ 
                  textAlign: 'right', 
                  fontSize: isMobile ? '24px' : '32px', 
                  fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace', 
                  color: 'white',
                  fontWeight: '600',
                  wordBreak: 'break-all',
                  minHeight: isMobile ? '30px' : '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}>
                  {calculatorDisplay}
                </div>
                {operation && (
                  <div style={{
                    textAlign: 'right',
                    fontSize: '14px',
                    color: '#94a3b8',
                    marginTop: '8px'
                  }}>
                    {previousValue} {operation}
                  </div>
                )}
                <div style={{
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '8px'
                }}>
                  API: {apiUrl}
                </div>
              </div>

              {/* Botões melhorados */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: isMobile ? '8px' : '12px' 
              }}>
                {calculatorButtons.flat().map((btn, index) => (
                  <button
                    key={index}
                    onClick={() => handleButtonClick(btn)}
                    style={getButtonStyle(btn)}
                    onTouchStart={() => {}}
                  >
                    {btn === '⌫' ? <Delete size={isMobile ? 16 : 20} /> : btn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equations' && (
          <div style={{ maxWidth: isMobile ? '100%' : '700px', margin: '0 auto' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: isMobile ? '20px' : '32px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
            }}>
              <h2 style={{ 
                fontSize: isMobile ? '20px' : '24px', 
                fontWeight: '700', 
                color: 'white', 
                marginBottom: isMobile ? '16px' : '24px', 
                textAlign: 'center' 
              }}>
                Solucionador de Equações
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#94a3b8', 
                    marginBottom: '12px' 
                  }}>
                    Equação Quadrática
                  </label>
                  <input
                    type="text"
                    value={equation}
                    onChange={(e) => setEquation(e.target.value)}
                    placeholder="Ex: x² + 5x + 6 = 0"
                    style={{
                      width: '100%',
                      padding: isMobile ? '12px 16px' : '16px 20px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: isMobile ? '16px' : '18px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: '"SF Mono", Monaco, monospace',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </div>

                <button
                  onClick={solveQuadratic}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    fontWeight: '600',
                    padding: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '16px',
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                    touchAction: 'manipulation'
                  }}
                >
                  Resolver Equação
                </button>

                {equationResult && (
                  <div style={{
                    background: equationResult.includes('inválid') || equationResult.includes('Erro') 
                      ? 'rgba(239, 68, 68, 0.2)' 
                      : 'rgba(34, 197, 94, 0.2)',
                    border: `1px solid ${equationResult.includes('inválid') || equationResult.includes('Erro') 
                      ? 'rgba(239, 68, 68, 0.3)' 
                      : 'rgba(34, 197, 94, 0.3)'}`,
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <h3 style={{ 
                      fontWeight: '600', 
                      color: equationResult.includes('inválid') || equationResult.includes('Erro') 
                        ? '#fca5a5' 
                        : '#86efac', 
                      margin: '0 0 12px 0' 
                    }}>
                      Resultado:
                    </h3>
                    <p style={{ 
                      color: 'white', 
                      fontFamily: '"SF Mono", Monaco, monospace', 
                      fontSize: isMobile ? '16px' : '18px', 
                      margin: 0,
                      fontWeight: '500',
                      wordBreak: 'break-word'
                    }}>
                      {equationResult}
                    </p>
                  </div>
                )}

                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ fontWeight: '600', color: '#93c5fd', margin: '0 0 12px 0' }}>
                    Formatos aceitos:
                  </h3>
                  <ul style={{ 
                    color: '#bfdbfe', 
                    fontSize: '14px', 
                    margin: 0, 
                    paddingLeft: '20px', 
                    lineHeight: '1.6' 
                  }}>
                    <li style={{ marginBottom: '6px' }}>x² + 5x + 6 = 0</li>
                    <li style={{ marginBottom: '6px' }}>2x² - 3x + 1 = 0</li>
                    <li style={{ marginBottom: '6px' }}>x² - 9 = 0</li>
                    <li>x^2 + 4x + 4 = 0</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Outras abas - ML e API */}
        {activeTab === 'ml' && (
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: isMobile ? '20px' : '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ 
              fontSize: isMobile ? '20px' : '24px', 
              fontWeight: '700', 
              color: 'white', 
              marginBottom: '24px', 
              textAlign: 'center' 
            }}>
              Machine Learning Tools
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '24px' 
            }}>
              <div>
                <h3 style={{ color: '#93c5fd', marginBottom: '16px' }}>Dataset Exemplo</h3>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '12px',
                  padding: '16px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', fontSize: '14px', color: 'white' }}>
                    <thead>
                      <tr style={{ color: '#93c5fd' }}>
                        <th style={{ textAlign: 'left', paddingBottom: '8px' }}>X</th>
                        <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mlData.slice(0, 8).map((point, i) => (
                        <tr key={i}>
                          <td style={{ paddingBottom: '4px', fontFamily: 'monospace' }}>{point.x}</td>
                          <td style={{ paddingBottom: '4px', fontFamily: 'monospace' }}>{point.y}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#93c5fd', marginBottom: '16px' }}>Estatísticas</h3>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                      <span>Média X:</span>
                      <span style={{ fontFamily: 'monospace' }}>{meanX.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                      <span>Média Y:</span>
                      <span style={{ fontFamily: 'monospace' }}>{meanY.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                      <span>Correlação:</span>
                      <span style={{ fontFamily: 'monospace' }}>{correlation.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px'
            }}>
              <h3 style={{ color: '#c4b5fd', margin: '0 0 12px 0' }}>🚀 Funcionalidades:</h3>
              <p style={{ color: '#ddd6fe', fontSize: '14px', margin: 0 }}>
                Regressão Linear • Estatísticas • Normalização • Correlação
              </p>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: isMobile ? '20px' : '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ 
              fontSize: isMobile ? '20px' : '24px', 
              fontWeight: '700', 
              color: 'white', 
              marginBottom: '24px', 
              textAlign: 'center' 
            }}>
              Documentação da API
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                {
                  method: 'GET',
                  endpoint: '/health',
                  description: 'Status da API',
                  color: '#22c55e'
                },
                {
                  method: 'POST',
                  endpoint: '/api/calculate',
                  description: 'Calculadora matemática',
                  color: '#3b82f6'
                },
                {
                  method: 'POST',
                  endpoint: '/api/quadratic',
                  description: 'Equações quadráticas',
                  color: '#a855f7'
                },
                {
                  method: 'POST',
                  endpoint: '/api/stats',
                  description: 'Estatísticas básicas',
                  color: '#f59e0b'
                }
              ].map((endpoint, i) => (
                <div key={i} style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      background: endpoint.color,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: '600'
                    }}>
                      {endpoint.method}
                    </span>
                    <span style={{ 
                      color: 'white', 
                      fontFamily: 'monospace', 
                      fontSize: isMobile ? '14px' : '16px',
                      fontWeight: '600'
                    }}>
                      {endpoint.endpoint}
                    </span>
                  </div>
                  <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0 }}>
                    {endpoint.description}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px'
            }}>
              <h3 style={{ color: '#93c5fd', margin: '0 0 12px 0' }}>🔗 Base URL</h3>
              <p style={{ 
                color: 'white', 
                fontFamily: 'monospace', 
                fontSize: '14px', 
                margin: 0,
                wordBreak: 'break-all'
              }}>
                {apiUrl}
              </p>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px'
            }}>
              <h3 style={{ color: '#86efac', margin: '0 0 8px 0' }}>📚 Documentação Completa</h3>
              <p style={{ color: '#bbf7d0', fontSize: '14px', margin: 0 }}>
                Acesse: <span style={{ fontFamily: 'monospace' }}>{apiUrl}/api-docs</span>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        marginTop: '60px',
        padding: isMobile ? '30px 16px' : '40px 24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              width: isMobile ? '40px' : '48px', 
              height: isMobile ? '40px' : '48px', 
              background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
            }}>
              <Calculator size={isMobile ? 20 : 24} color="white" />
            </div>
            <h3 style={{ 
              color: 'white', 
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: '600', 
              margin: 0 
            }}>
              EquationHub
            </h3>
          </div>
          <p style={{ 
            color: '#94a3b8', 
            margin: '0 0 8px 0', 
            fontSize: isMobile ? '14px' : '16px' 
          }}>
            Feito com ❤️ para a comunidade de desenvolvedores
          </p>
          <p style={{ 
            color: '#64748b', 
            fontSize: isMobile ? '12px' : '14px', 
            margin: 0 
          }}>
            Conectado à API: {apiUrl}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EquationHub;
