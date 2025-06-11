import React from 'react';

const SyncLoader = ({ isSyncing, children }) => {
  return (
    <div>
      {isSyncing ? <h1>Syncing Data... </h1> : null}
      {children}
    </div>
  );
};

export default SyncLoader;
