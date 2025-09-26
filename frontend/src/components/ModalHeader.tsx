
export function ModalHeader({
    isPlayerOpen,
    onClickExpand,
    myTotal,
    formatPrice,
}: {
    isPlayerOpen: boolean;
    onClickExpand: () => void;
    myTotal: number;
    formatPrice: (price: number) => string;
}) {
    return (
        <>
            {!isPlayerOpen && (
                <div className="mini-player" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    margin: '16px',
                    border: '1px solid #e9ecef'
                }}>
                    <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#2c3e50'
                    }}>
                        {formatPrice(myTotal)}
                    </div>
                    <div 
                        className="pay-button" 
                        onClick={onClickExpand}
                        style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#c82333';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc3545';
                        }}
                    >
                        Pagar
                    </div>
                </div>
            )}
        </>
    );
}