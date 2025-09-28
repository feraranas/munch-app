import * as React from 'react';
import SimpleAvatar from './Avatar';

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
const usedAssetsPerSession: { [sessionId: string]: Map<string, string> } = {};

// Available asset files from /public/assets directory
const availableAssets = [
  '1.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png', '9.png', '10.png',
  '11.png', '12.png', '13.png', '14.png', '15.png', '16.png', '17.png', '18.png', '19.png', '20.png',
  '21.png', '22.png', '23.png', '24.png', '25.png', '26.png', '27.png', '28.png', '29.png', '30.png',
  '31.png', '32.png', '33.png', '34.png', '35.png'
];

const CollaborativeUsers: React.FC<CollaborativeUsersProps> = ({ 
  qrSessionId, 
  isConnected, 
  connectedUsers 
}) => {
  if (!isConnected) {
    return null;
  }

  // User ID is deterministic based on device fingerprint e.g.08e63427
  const getConsistentAsset = (userId: string): string => {
    // Initialize used assets set for this session if it doesn't exist
    if (!usedAssetsPerSession[qrSessionId]) {
      usedAssetsPerSession[qrSessionId] = new Map();
    }

    const sessionMap = usedAssetsPerSession[qrSessionId];

    // If this user has an asset already assigned, return it
    if (sessionMap.has(userId)) {
      return sessionMap.get(userId)!; // <-- "!" tells TS it's safe
    }

    // Generate a deterministic asset based on user ID
    // This ensures the same user ID always gets the same asset (when available)
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    let preferredAssetIndex = hash % availableAssets.length;
    let selectedAsset = availableAssets[preferredAssetIndex];

    // If preferred asset is already taken by someone else in this session, find next available
    const sessionAssets = new Set(sessionMap.values());
    let attempts = 0;
    while (sessionAssets.has(selectedAsset) && attempts < availableAssets.length) {
      preferredAssetIndex = (preferredAssetIndex + 1) % availableAssets.length;
      selectedAsset = availableAssets[preferredAssetIndex];
      attempts++;
    }

    // If all assets are somehow taken (shouldn't happen with enough assets), use fallback
    if (attempts >= availableAssets.length) {
      selectedAsset = '1.png';
    }

    // Save assignment for this session
    sessionMap.set(userId, selectedAsset);

    console.log(`Assigned asset ${selectedAsset} to user ${userId} in session ${qrSessionId}`);
    return selectedAsset;
  };

  

  return (
    <div className="w-full flex justify-center items-center pt-2 pb-2">
      <div className="flex flex-row gap-4">
        {connectedUsers
          .filter(user => user.qr_session === qrSessionId)
          .map((user, index) => (
            <SimpleAvatar
              key={user.id}
              bgColor={'#d8d8d8'}
              assetName={getConsistentAsset(user.id)}
            />
          ))}
      </div>
    </div>
  );
};

export default CollaborativeUsers;