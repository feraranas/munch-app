import React from 'react';
import PaymentButton from './PaymentButton';

interface PaymentSummaryProps {
  myTotal: number;
  totalPaidByGroup: number;
  totalPaid: number;
  remainingBalance: number;
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
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        <span style={{ fontSize: '16px', fontWeight: '500' }}>Tu total seleccionado:</span>
        <span style={{ 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: myTotal > 0 ? '#007bff' : '#6c757d'
        }}>
          {formatPrice(myTotal)}
        </span>
      </div>
      
      <div style={{
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
      </div>
      
      <div style={{
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
      </div>
      
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
