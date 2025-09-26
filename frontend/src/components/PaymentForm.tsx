interface PaymentFormProps {
  myTotal: number;
  selectedItemsCount: number;
  paymentProcessing: boolean;
  formatPrice: (price: number) => string;
  onConfirmPayment: () => void;
  onCancel: () => void;
}

function PaymentForm({ 
  myTotal, 
  selectedItemsCount, 
  paymentProcessing, 
  formatPrice, 
  onConfirmPayment, 
  onCancel 
}: PaymentFormProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-2xl">
      <div className="text-center mb-5">
        <h3 className="m-0 mb-2 text-gray-800">💳 Pago con Stripe</h3>
        <p className="m-0 text-gray-500 text-sm">
          Pago simulado - No se procesará dinero real
        </p>
      </div>
      
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-base">Total a pagar:</span>
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(myTotal)}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''} seleccionado{selectedItemsCount !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Mock Credit Card Form */}
      <div className="mb-5">
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-sm text-gray-500">
          <div className="mb-2">
            💳 **** **** **** 4242 (Mock Stripe Card)
          </div>
          <div>
            🔒 Pago seguro simulado
          </div>
        </div>
      </div>
      
      {/* Payment Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={paymentProcessing}
          className={`flex-1 py-3 px-4 bg-gray-500 text-white border-none rounded-md text-base transition-colors duration-200 ${
            paymentProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-600'
          }`}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmPayment}
          disabled={paymentProcessing}
          className={`flex-[2] py-3 px-4 bg-green-600 text-white border-none rounded-md text-base font-medium transition-colors duration-200 ${
            paymentProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-green-700'
          }`}
        >
          {paymentProcessing ? '⏳ Procesando...' : '✅ Confirmar Pago'}
        </button>
      </div>
    </div>
  );
}

export default PaymentForm;
