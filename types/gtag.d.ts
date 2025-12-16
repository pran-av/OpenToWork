declare global {
  interface Window {
    dataLayer: any[];
    gtag: (
      command: string,
      targetId: string | Date,
      config?: {
        [key: string]: any;
      }
    ) => void;
  }
}

export {};
