// Polyfill for crypto.randomUUID to support non-secure contexts and iframes
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    (window as any).crypto = {} as any;
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }) as any;
    };
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { simulateFetch } from './lib/clientDb';

// Extend window interface to support Client-Side fallback flag
declare global {
  interface Window {
    __useClientSideFallback?: boolean;
  }
}

const originalFetch = window.fetch;
const customFetch = async function(this: any, input: RequestInfo | URL, init?: RequestInit) {
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else if (input && typeof input === "object" && "url" in input) {
    url = (input as any).url;
  }

  // Check if it's an API route
  const isApiRoute = url.startsWith("/api/") || url.includes("/api/");

  if (!isApiRoute) {
    return originalFetch.apply(this || window, [input, init]);
  }

  // If already flagged to use client-side fallback, bypass network entirely to avoid latency/errors
  if (window.__useClientSideFallback) {
    return simulateFetch(url, init);
  }

  try {
    const response = await originalFetch.apply(this || window, [input, init]);
    const contentType = response.headers.get("content-type") || "";
    
    // On static hosting like Vercel, requests to non-existent /api/* can return 404, 405, or index.html (SPA routing fallback)
    if (!response.ok) {
      console.warn(`API ${url} returned status ${response.status}. Switching to local Client-Side Database Fallback.`);
      window.__useClientSideFallback = true;
      return simulateFetch(url, init);
    }

    if (contentType.includes("text/html")) {
      console.warn(`API ${url} returned HTML content-type instead of JSON. Switching to local Client-Side Database Fallback.`);
      window.__useClientSideFallback = true;
      return simulateFetch(url, init);
    }

    return response;
  } catch (error) {
    console.warn(`API ${url} network error. Switching to local Client-Side Database Fallback.`, error);
    window.__useClientSideFallback = true;
    return simulateFetch(url, init);
  }
};

// Safely override global fetch property bypassing prototype getter restriction
try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Failed to define property on window.fetch, attempting globalThis override.", e);
  try {
    (globalThis as any).fetch = customFetch;
  } catch (err) {
    console.error("Critical: Could not safely override fetch.", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

