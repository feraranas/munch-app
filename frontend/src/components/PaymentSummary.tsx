import React from 'react';
import PaymentButton from './PaymentButton';

interface PaymentSummaryProps {
  myTotal: number;
  totalPaidByGroup?: number;
  totalPaid?: number;
  remainingBalance?: number;
  paymentProcessing: boolean;
  formatPrice: (price: number) => string;
  onPayment: () => void;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  myTotal,
  totalPaidByGroup,
  totalPaid,
  remainingBalance,
  paymentProcessing,
  formatPrice,
  onPayment
}) => {
  return (
    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-5">
      <div className="flex justify-between items-center mb-3">
        <span className="text-base font-medium">Tu total seleccionado:</span>
        <span className={`text-lg font-bold ${myTotal > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
          {formatPrice(myTotal)}
        </span>
      </div>
      
      {/* <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingTop: '10px',
        borderTop: '1px solid #dee2e6'
      }}>
        <span style={{ fontSize: '14px', color: '#6c757d' }}>Total pagado por el grupo:</span>
        <span style={{ fontSize: '16px', fontWeight: '500', color: '#28a745' }}>
          {formatPrice(totalPaid + totalPaidByGroup)}
        </span>
      </div> */}
      
      {/* <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <span style={{ fontSize: '16px', fontWeight: '500' }}>Saldo restante:</span>
        <span style={{ 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: remainingBalance > 0 ? '#dc3545' : '#28a745'
        }}>
          {formatPrice(remainingBalance)}
        </span>
      </div> */}
      
      <PaymentButton
        myTotal={myTotal}
        paymentProcessing={paymentProcessing}
        formatPrice={formatPrice}
        onPayment={onPayment}
      />
    </div>
  );
};

export default PaymentSummary;
