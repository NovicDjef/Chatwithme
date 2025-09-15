// useSessionRenewal.js - Hook pour renouveler automatiquement la session
import { useEffect } from 'react';
import { useAppDispatch } from '../redux/useAppDispatch';
import { useAppSelector } from '../redux/useAppSelector';
import { authAPI } from '../../store/services/api';
import StorageService from '../../store/services/storage';
import { selectUser, selectToken } from '../../store/slices/authSlice';

export const useSessionRenewal = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const token = useAppSelector(selectToken);

  useEffect(() => {
    // Ne faire la vérification que si l'utilisateur est connecté
    if (!user || !token) {
      return;
    }

    // Vérifier le token toutes les 5 minutes
    const interval = setInterval(async () => {
      try {
        console.log('🔄 Periodic token verification...');

        // Vérifier si le token est encore valide
        await authAPI.verifyToken();

        // Si valide, renouveler le timestamp
        await StorageService.renewSessionTimestamp();

        console.log('✅ Token still valid, session renewed');
      } catch (error) {
        console.log('⚠️ Token verification failed during renewal:', error.response?.status);

        // Si le token est expiré (401), laisser la logique normale s'en occuper
        // L'intercepteur API va nettoyer la session automatiquement
        if (error.response?.status === 401) {
          console.log('🔓 Token expired, will be handled by API interceptor');
          clearInterval(interval);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Nettoyer l'interval quand le composant se démonte ou que l'utilisateur se déconnecte
    return () => {
      clearInterval(interval);
    };
  }, [user, token]);

  return null; // Ce hook ne retourne rien, il fait juste la logique en arrière-plan
};

export default useSessionRenewal;