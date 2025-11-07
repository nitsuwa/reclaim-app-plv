"use client";

import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#000000',
          border: '1px solid rgba(0, 51, 102, 0.15)',
        },
        descriptionStyle: {
          color: '#1a1a1a',
          opacity: 1,
        },
        classNames: {
          description: 'toast-description-dark',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
