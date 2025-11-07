import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';
import { Input } from './ui/input';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export const OTPInput = ({ length = 6, value, onChange, onComplete }: OTPInputProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChange = (index: number, inputValue: string) => {
    const newValue = value.split('');
    newValue[index] = inputValue.slice(-1);
    const finalValue = newValue.join('');
    onChange(finalValue);

    // Auto-focus next input
    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (finalValue.length === length && onComplete) {
      onComplete(finalValue);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    onChange(pastedData);
    
    // Focus the last filled input
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          className={`w-12 h-14 text-center transition-all ${
            focusedIndex === index 
              ? 'border-2 border-accent shadow-lg scale-105' 
              : 'border-2 border-border'
          }`}
        />
      ))}
    </div>
  );
};