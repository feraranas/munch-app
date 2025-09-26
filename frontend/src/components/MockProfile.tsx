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
      className="w-10 h-10 rounded-full flex items-center justify-center text-base text-white font-bold"
      style={{ backgroundColor: bgColor }}
    >
      {children}
    </div>
  );

  return (
    <div className="flex flex-row gap-4">
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