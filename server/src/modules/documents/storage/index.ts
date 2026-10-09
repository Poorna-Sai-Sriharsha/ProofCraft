import { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './localStorage.js';

let activeProvider: IStorageProvider = new LocalStorageProvider();

export const getStorageProvider = (): IStorageProvider => {
  return activeProvider;
};

export const setStorageProvider = (provider: IStorageProvider): void => {
  activeProvider = provider;
};
