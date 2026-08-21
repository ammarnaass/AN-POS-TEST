// API client re-exports
export { apiFetch, ApiError, qs } from './client';
export { productsApi, toWriteBody } from './productsApi';
export { categoriesApi } from './categoriesApi';
export type { Category, CategoryWrite } from './categoriesApi';
export { barcodePrintsApi } from './barcodePrintsApi';
export type { BarcodePrint, BarcodePrintWrite } from './barcodePrintsApi';
