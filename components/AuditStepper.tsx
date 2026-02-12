import React from 'react';
import { STEPS } from '../constants';
import { Check } from 'lucide-react';

interface Props {
  currentStep: number;
  setStep: (step: number) => void;
}

export const AuditStepper: React.FC<Props> = ({ currentStep, setStep }) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex overflow-x-auto">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setStep(index)}
                disabled={index > currentStep} // Force linear progression
                className={`flex-1 min-w-[150px] py-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 focus:outline-none ${
                  isActive
                    ? 'border-orange-600 text-orange-600 bg-orange-50'
                    : isCompleted
                    ? 'border-transparent text-gray-500 hover:text-gray-700'
                    : 'border-transparent text-gray-300 cursor-default'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isActive ? 'bg-orange-600 text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? <Check size={14} /> : index + 1}
                </div>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};