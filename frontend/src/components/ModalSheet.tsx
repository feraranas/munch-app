import { Sheet } from 'react-modal-sheet';
import { useState } from 'react';
import { ModalHeader } from './ModalHeader';
import PaymentSummary from './PaymentSummary';

interface ModalSheetProps {
  myTotal: number;
  totalPaidByGroup: number;
  totalPaid: number;
  remainingBalance: number;
  paymentProcessing: boolean;
  formatPrice: (price: number) => string;
  onPayment: () => void;
}

function ModalSheet({ 
  myTotal, 
  totalPaidByGroup, 
  totalPaid, 
  remainingBalance, 
  paymentProcessing, 
  formatPrice, 
  onPayment 
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
      />
      
      <Sheet
        isOpen={isOpen}
        onClose={onClickCloseModalCTA}
        // modalEffectRootId="root"
      >
        <Sheet.Container style={{ backgroundColor: "#222", maxWidth: "680px" }}>
          <Sheet.Header />
            {/* <Sheet.DragIndicator /> */}
          <Sheet.Content>
            <PaymentSummary
              myTotal={myTotal}
              totalPaidByGroup={totalPaidByGroup}
              totalPaid={totalPaid}
              remainingBalance={remainingBalance}
              paymentProcessing={paymentProcessing}
              formatPrice={formatPrice}
              onPayment={onPayment}
            />
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
    
    </Sheet >
    </>
  );
}

export default ModalSheet;