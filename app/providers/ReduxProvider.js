// app/providers/ReduxProvider.js - Provider Redux pour l'application
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import store, { setupSocketListeners } from '../store';

const ReduxProvider = ({ children }) => {
  useEffect(() => {
    // Configurer les listeners WebSocket avec Redux
    setupSocketListeners(store);

    console.log('🎯 Redux Provider initialized with WebSocket integration');
  }, []);

  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

export default ReduxProvider;