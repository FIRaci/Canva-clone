export const usePaywall = () => {
  return {
    isLoading: false,
    shouldBlock: false,
    triggerPaywall: () => {},
  };
};
