/**
 * Client-side utility for handling API responses with anonymous auth redirects.
 * When API returns redirect response for anonymous users, shows toast and redirects.
 */

import { useRouter } from "next/navigation";

export interface ApiRedirectResponse {
  error: string;
  redirect: string;
  message: string;
}

/**
 * Checks if an API response indicates an anonymous auth redirect.
 * If so, shows toast and redirects to auth page.
 * 
 * @param response - Fetch Response object
 * @param router - Next.js router instance
 * @param showToast - Function to show toast message (optional)
 * @returns true if redirect was handled, false otherwise
 */
export async function handleApiRedirectResponse(
  response: Response,
  router: ReturnType<typeof useRouter>,
  showToast?: (message: string, type: "success" | "error") => void
): Promise<boolean> {
  if (response.status === 401) {
    try {
      const data = await response.json();
      if (data.redirect && data.message) {
        // Show toast if provided
        if (showToast) {
          showToast(data.message, "error");
        } else {
          // Fallback: use browser alert if no toast function provided
          alert(data.message);
        }
        
        // Redirect to auth page
        router.push(data.redirect);
        return true;
      }
    } catch (error) {
      // If response is not JSON, ignore
    }
  }
  return false;
}

/**
 * Wrapper for fetch that automatically handles anonymous auth redirects.
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @param router - Next.js router instance
 * @param showToast - Function to show toast message (optional)
 * @returns Fetch response (or throws if redirect was handled)
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  router: ReturnType<typeof useRouter>,
  showToast?: (message: string, type: "success" | "error") => void
): Promise<Response> {
  const response = await fetch(url, options);
  
  // Check for redirect response
  const handled = await handleApiRedirectResponse(response, router, showToast);
  if (handled) {
    // Throw a special error to stop execution
    throw new Error("Redirected to auth");
  }
  
  return response;
}
