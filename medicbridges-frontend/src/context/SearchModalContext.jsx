import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SearchModalContext = createContext(null);

// The search entry flow is a short sequence of modals:
//   'options'  -> SearchOptionsModal (anonymous vs. account)
//   'location' -> LocationPromptModal (device location or ZIP)
// after which the Search page runs the query behind SearchLoadingModal.
export function SearchModalProvider({ children }) {
  const [step, setStep] = useState(null);

  const openModal = useCallback(() => setStep('options'), []);
  const openLocationPrompt = useCallback(() => setStep('location'), []);
  const closeModal = useCallback(() => setStep(null), []);

  const value = useMemo(
    () => ({
      isOpen: step === 'options',
      isLocationOpen: step === 'location',
      openModal,
      openLocationPrompt,
      closeModal,
    }),
    [step, openModal, openLocationPrompt, closeModal],
  );

  return (
    <SearchModalContext.Provider value={value}>
      {children}
    </SearchModalContext.Provider>
  );
}

export function useSearchModal() {
  const ctx = useContext(SearchModalContext);
  if (!ctx) {
    throw new Error('useSearchModal must be used within SearchModalProvider');
  }
  return ctx;
}
