import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SearchModalContext = createContext(null);

// The search entry flow is a short sequence of modals:
//   'options'  -> SearchOptionsModal (anonymous vs. account)
//   'location' -> LocationPromptModal (device location or ZIP)
// after which the Search page runs the query behind SearchLoadingModal.
export function SearchModalProvider({ children }) {
  const [step, setStep] = useState(null);
  // True when the prompt was opened to *change* a location that is already
  // saved: it then starts on the picker instead of the confirmed state.
  const [freshLocation, setFreshLocation] = useState(false);

  const openModal = useCallback(() => setStep('options'), []);
  const openLocationPrompt = useCallback((options) => {
    setFreshLocation(options?.fresh === true);
    setStep('location');
  }, []);
  const closeModal = useCallback(() => setStep(null), []);

  const value = useMemo(
    () => ({
      isOpen: step === 'options',
      isLocationOpen: step === 'location',
      freshLocation,
      openModal,
      openLocationPrompt,
      closeModal,
    }),
    [step, freshLocation, openModal, openLocationPrompt, closeModal],
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
