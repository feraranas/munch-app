
export function ModalHeader({
    isPlayerOpen,
    onClickExpand,
    myTotal,
    formatPrice,
    buttonText = "Pagar",
    disabled = false,
    hint,
}: {
    isPlayerOpen: boolean;
    onClickExpand: () => void;
    myTotal: number;
    formatPrice: (price: number) => string;
    buttonText?: string;
    disabled?: boolean;
    hint?: string;
}) {
    return (
        <>
            {!isPlayerOpen && (
                <div className=" fixed bottom-16 left-0 right-0
                                 flex justify-center items-center 
                                 px-10 py-3
                                 z-10
                                 ">
                    <div className="flex flex-col gap-1
                                    px-4 py-3 bg-white shadow-md
                                    rounded-xl border border-gray-100
                                    w-full max-w-sm
                                    ">
                        <div className="flex justify-between items-center w-full">
                            <div className="text-sm font-semibold text-gray-800">
                                Total {formatPrice(myTotal)}
                            </div>
                            <button 
                                className={`bg-gradient-to-r from-red-500 to-red-600 text-white 
                                           py-3 px-6 rounded-xl text-base font-medium 
                                           border-none transition-all duration-200 shadow-sm
                                           ${disabled
                                             ? 'opacity-50 cursor-not-allowed'
                                             : 'hover:from-red-500 hover:to-red-700 cursor-pointer'}`}
                                onClick={onClickExpand}
                                disabled={disabled}
                            >
                                {buttonText}
                            </button>
                        </div>
                        {hint ? (
                            <p className="text-xs text-amber-700 leading-snug">{hint}</p>
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
}
