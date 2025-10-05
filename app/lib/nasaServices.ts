// Lightweight compatibility shim.
// Export everything from the canonical services implementation so imports from `app/lib` still work.
export * from '../services/nasaServices'
export { default } from '../services/nasaServices'
