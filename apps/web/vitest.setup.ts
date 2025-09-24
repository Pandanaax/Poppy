import "@testing-library/jest-dom"; 

if (typeof window !== "undefined" && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}