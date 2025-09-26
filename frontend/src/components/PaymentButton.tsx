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
  const backgroundColor = myTotal > 0 ? '#007bff' : '#6c757d';
  
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
      style={{
        width: '100%',
        padding: '12px',
        backgroundColor,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: myTotal > 0 ? 'pointer' : 'not-allowed',
        transition: 'background-color 0.2s ease'
      }}
    >
      {getButtonText()}
    </button>
  );
};

export default PaymentButton;
