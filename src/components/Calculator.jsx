import { useState } from 'react';
import { Calculator as CalcIcon, X } from 'lucide-react';

export function CalculatorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');

  const handlePress = (val) => {
    if (val === 'C') {
      setExpression('');
      setResult('');
    } else if (val === '=') {
      try {
        // Remplacement de x par * pour l'évaluation
        const evalStr = expression.replace(/x/g, '*');
        // Evaluation sécurisée basique
        // eslint-disable-next-line no-new-func
        const res = new Function('return ' + evalStr)();
        if (Number.isFinite(res)) {
          setResult(String(res));
          setExpression(String(res));
        } else {
          setResult('Erreur');
        }
      } catch (err) {
        setResult('Erreur');
      }
    } else {
      setExpression((prev) => prev + val);
    }
  };

  const buttons = [
    'C', '(', ')', '/',
    '7', '8', '9', 'x',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '=', 
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-600/30 transition-all hover:scale-110 flex items-center justify-center group"
      >
        <CalcIcon className="w-6 h-6" />
        <span className="absolute right-full mr-4 bg-zinc-900 text-zinc-300 text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-800">
          Ouvrir la calculette
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-72 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl shadow-black overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-900/50">
        <div className="flex items-center gap-2 text-indigo-400 font-medium">
          <CalcIcon className="w-4 h-4" />
          Calculette
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-end bg-zinc-950 min-h-[100px]">
        <div className="text-right text-zinc-500 text-sm mb-1 h-5 overflow-hidden">
          {expression !== result ? expression : ''}
        </div>
        <div className="text-right text-3xl font-bold text-white overflow-hidden text-ellipsis">
          {expression || '0'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 p-2 bg-zinc-900">
        {buttons.map((btn, idx) => {
          const isOperator = ['/', 'x', '-', '+', '='].includes(btn);
          const isAction = ['C', '(', ')'].includes(btn);
          const isZero = btn === '0';
          
          return (
            <button
              key={idx}
              onClick={() => handlePress(btn)}
              className={`
                p-3 md:p-4 min-h-[44px] text-lg font-semibold rounded-xl transition-colors
                ${isZero ? 'col-span-2' : ''}
                ${isOperator 
                  ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white' 
                  : isAction 
                    ? 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white' 
                    : 'bg-zinc-800/20 text-zinc-200 hover:bg-zinc-800'
                }
              `}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
}
