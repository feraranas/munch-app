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

  const colors = ['#d7d7d7', '#7b1fa2'];
  const emojis = ['😊', '🤗', '😎', '🥳', '😄', '🙂', '😃', '😆', '🤓', '😇', '🤠', '🥰', '😋', '🤗', '😌', '🤩'];

  const getRandomEmoji = (userId: string) => {
    // Use userId as seed for consistent emoji per user
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
    return emojis[index];
  };

  const SimpleAvatar = ({ bgColor, children }: { bgColor: string; children: string }) => (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
      style={{ backgroundColor: bgColor }}
    >
      {children}
    </div>
  );

  return (
    <div className="w-full flex justify-center items-center pt-2 pb-2">
      <div className="flex flex-row gap-4">
        {connectedUsers
          .filter(user => user.qr_session === qrSessionId)
          .map((user, index) => (
            <SimpleAvatar
              key={user.id}
              bgColor={colors[index % colors.length]}
            >
              {getRandomEmoji(user.id)}
            </SimpleAvatar>
          ))}
      </div>
    </div>
  );
};

export default CollaborativeUsers;