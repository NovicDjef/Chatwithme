// app/hooks/redux/useAppSelector.js - Hook personnalisé pour les sélecteurs
import { useSelector } from 'react-redux';

export const useAppSelector = (selector) => useSelector(selector);