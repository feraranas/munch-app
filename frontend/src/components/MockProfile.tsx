import * as React from 'react';

interface User {
  id: string;
  qr_session: string;
  avatar: string;
  joined_at: number;
}

interface CollaborativeUsersProps {
  qrSessionId: string;
  isConnected: boolean;
  connectedUsers: User[];
}

const CollaborativeUsers: React.FC<CollaborativeUsersProps> = ({ 
  qrSessionId, 
  isConnected, 
  connectedUsers 
}) => {
  if (!isConnected) {
    return null;
  }

  const colors = ['#f4511e', '#7b1fa2'];

  const SimpleAvatar = ({ bgColor, children }: { bgColor: string; children: string }) => (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        color: 'white',
        fontWeight: 'bold',
      }}
    >
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'row' as const, gap: '16px' }}>
      {connectedUsers
        .filter(user => user.qr_session === qrSessionId)
        .map((user, index) => (
          <SimpleAvatar
            key={user.id}
            bgColor={colors[index % colors.length]}
          >
            {user.avatar}
          </SimpleAvatar>
        ))}
    </div>
  );
};

export default CollaborativeUsers;