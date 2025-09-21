import React from 'react';

interface MockProfileProps {
  qrSessionId: string;
  isConnected: boolean;
}

const MockProfile: React.FC<MockProfileProps> = ({ qrSessionId, isConnected }) => {
  // Generate a simple mock avatar based on the session ID
  const hashCode = (str: string) => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };
  
  const sessionHash = hashCode(qrSessionId);
  const avatarColor = `hsl(${Math.abs(sessionHash) % 360}, 70%, 50%)`;
  const userNumber = Math.abs(sessionHash) % 1000;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      backgroundColor: isConnected ? '#e8f5e8' : '#f8f9fa',
      border: `2px solid ${isConnected ? '#28a745' : '#dee2e6'}`,
      borderRadius: '12px',
      marginBottom: '20px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: avatarColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px'
      }}>
        {`U${userNumber.toString().slice(-2)}`}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: '600', 
          fontSize: '16px',
          marginBottom: '4px' 
        }}>
          Usuario Conectado
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#6c757d',
          marginBottom: '4px'
        }}>
          Sesión: {qrSessionId}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#28a745' : '#dc3545',
            animation: isConnected ? 'pulse 2s infinite' : 'none'
          }}></div>
          <span style={{ color: isConnected ? '#28a745' : '#dc3545' }}>
            {isConnected ? '🟢 Conectado en tiempo real' : '🔴 Desconectado'}
          </span>
        </div>
      </div>
    </div>
  );
};


export default MockProfile;
