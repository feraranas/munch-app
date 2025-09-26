import React from 'react';

interface PaymentButtonProps {
  myTotal: number;
  paymentProcessing: boolean;
  formatPrice: (price: number) => string;
  onPayment: () => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  myTotal,
  paymentProcessing,
  formatPrice,
  onPayment
}) => {
  const isDisabled = myTotal <= 0 || paymentProcessing;
  
  const getButtonText = () => {
    if (paymentProcessing) return '⏳ Procesando...';
    if (myTotal > 0) return `💳 Pagar ${formatPrice(myTotal)}`;
    // return '📱 Selecciona items para pagar';
    return 'Pagar';
  };

  return (
    <button
      onClick={onPayment}
      disabled={isDisabled}
      className={`w-full py-3 px-4 text-white border-none rounded-md text-base font-medium transition-colors duration-200 ${
        myTotal > 0 
          ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
          : 'bg-gray-500 cursor-not-allowed'
      } ${isDisabled ? 'opacity-60' : ''}`}
    >
      {getButtonText()}
    </button>
  );
};

export default PaymentButton;
