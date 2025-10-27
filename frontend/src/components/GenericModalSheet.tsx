import React from 'react';
import { Sheet } from 'react-modal-sheet';

interface GenericModalSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}

const GenericModalSheet: React.FC<GenericModalSheetProps> = ({
  isOpen,
  onOpenChange,
  title,
  children,
  trigger,
}) => {
  return (
    <>
      {/* Trigger element (if provided) */}
      {trigger && (
        <div onClick={() => onOpenChange(true)}>
          {trigger}
        </div>
      )}

      {/* Modal Sheet */}
      <Sheet
        isOpen={isOpen}
        onClose={() => onOpenChange(false)}
      >
        <Sheet.Container className="bg-gray-50">
          <Sheet.Header />
          <Sheet.Content>
            {/* Optional Title */}
            {title && (
              <div className="px-6 pt-4 pb-2">
                <h2 className="text-xl font-semibold text-gray-800">
                  {title}
                </h2>
              </div>
            )}
            
            {/* Dynamic Content */}
            <div className="px-6 pb-6">
              {children}
            </div>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
      </Sheet>
    </>
  );
};

export default GenericModalSheet;

