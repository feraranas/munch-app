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

// Global map to track used assets per QR session
const usedAssetsPerSession: { [sessionId: string]: Set<string> } = {};

const CollaborativeUsers: React.FC<CollaborativeUsersProps> = ({ 
  qrSessionId, 
  isConnected, 
  connectedUsers 
}) => {
  if (!isConnected) {
    return null;
  }

  const colors = ['#d7d7d7', '#7b1fa2'];
  // Asset files from /public/assets directory
  const assets = [
    '1.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png', '9.png', '10.png',
    '11.png', '12.png', '13.png', '14.png', '15.png', '16.png', '17.png', '18.png', '19.png', '20.png',
    '21.png', '22.png', '23.png', '24.png', '25.png', '26.png', '27.png', '28.png', '29.png', '30.png',
    '31.png', '32.png', '33.png', '34.png', '35.png'
  ];

  const getRandomAsset = (userId: string) => {
    // Initialize used assets set for this session if it doesn't exist
    if (!usedAssetsPerSession[qrSessionId]) {
      usedAssetsPerSession[qrSessionId] = new Set();
    }
    
    const usedAssets = usedAssetsPerSession[qrSessionId];
    const availableAssets = assets.filter(asset => !usedAssets.has(asset));
    
    // If all assets are used, reset the set for this session
    if (availableAssets.length === 0) {
      usedAssets.clear();
      availableAssets.push(...assets);
    }
    
    // Use userId as seed for consistent asset per user
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % availableAssets.length;
    const selectedAsset = availableAssets[index];
    
    // Mark this asset as used for this session
    usedAssets.add(selectedAsset);
    
    return selectedAsset;
  };

  const SimpleAvatar = ({ bgColor, assetName }: { bgColor: string; assetName: string }) => (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <img 
        src={`/assets/${assetName}`} 
        alt="User avatar" 
        className="w-full h-full object-cover"
      />
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
              bgColor={'#d8d8d8'}
              assetName={getRandomAsset(user.id)}
            />
          ))}
      </div>
    </div>
  );
};

export default CollaborativeUsers;