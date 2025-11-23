import React from 'react';
import { Button } from './Button';

interface KeypadProps {
  onDigitPress: (digit: number) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({ onDigitPress, onBackspace, onClear }) => {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-1">
        {digits.map((digit) => (
          <Button
            key={digit}
            onClick={() => onDigitPress(digit)}
            variant="primary"
            className="h-16 text-2xl"
          >
            {digit}
          </Button>
        ))}
        
        <Button
          onClick={onClear}
          variant="secondary"
          className="h-16 text-base text-pink-500 border-pink-900/50 hover:border-pink-500"
        >
          CLR
        </Button>
        
        <Button
          onClick={() => onDigitPress(0)}
          variant="primary"
          className="h-16 text-2xl"
        >
          0
        </Button>
        
        <Button
          onClick={onBackspace}
          variant="secondary"
          className="h-16 text-2xl text-pink-500 border-pink-900/50 hover:border-pink-500"
        >
          ←
        </Button>
      </div>
    </div>
  );
};