import { Sheet } from 'react-modal-sheet';
import { useState } from 'react';
import { ModalHeader } from './ModalHeader';
import PaymentSummary from './PaymentSummary';
import PaymentForm from './PaymentForm';

interface ModalSheetProps {
  myTotal: number;
  totalPaidByGroup?: number;
  totalPaid?: number;
  remainingBalance?: number;
  paymentProcessing: boolean;
  selectedItemsCount: number;
  formatPrice: (price: number) => string;
  onPayment: () => void;
  onCancelPayment: () => void;
  buttonText?: string;
}

function ModalSheet({ 
  myTotal, 
  totalPaidByGroup, 
  totalPaid, 
  remainingBalance, 
  paymentProcessing, 
  selectedItemsCount,
  formatPrice, 
  onPayment,
  onCancelPayment,
  buttonText 
}: ModalSheetProps) {
  const [isOpen, setOpen] = useState(false);
  const onClickExpandModalCTA = () => setOpen(true);  
  const onClickCloseModalCTA = () => setOpen(false);  

  return (
    <>
      {/* Opens to 50% since initial index is 1 */}
      {/* <Sheet
        ref={ref}
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        initialSnap={1}
        snapPoints={snapPoints}
        onSnap={(snapIndex) =>
          console.log('> Current snap point index:', snapIndex)
        }
        detent="content"
      > */}
      <ModalHeader 
        isPlayerOpen={isOpen} 
        onClickExpand={onClickExpandModalCTA} 
        myTotal={myTotal}
        formatPrice={formatPrice}
        buttonText={buttonText}
      />
      
      <Sheet
        isOpen={isOpen}
        onClose={onClickCloseModalCTA}
        // modalEffectRootId="root"
      >
        <Sheet.Container style={{ backgroundColor: "#f7e5e5", maxWidth: "680px" }}>
          <Sheet.Header />
            {/* <Sheet.DragIndicator /> */}
          <Sheet.Content>
            <PaymentSummary
              myTotal={myTotal}
              // totalPaidByGroup={totalPaidByGroup ?? 0}
              // totalPaid={totalPaid ?? 0}
              // remainingBalance={remainingBalance ?? 0}
              paymentProcessing={paymentProcessing}
              formatPrice={formatPrice}
              onPayment={onPayment}
            />
            <PaymentForm
              myTotal={myTotal}
              selectedItemsCount={selectedItemsCount}
              paymentProcessing={paymentProcessing}
              formatPrice={formatPrice}
              onConfirmPayment={onPayment}
              onCancel={onCancelPayment}
            />
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
    
    </Sheet >
    </>
  );
}

export default ModalSheet;