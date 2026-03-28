'use client';

import React from 'react';

export default function DeleteConfirmButton({ 
  action, 
  message, 
  className, 
  children 
}: { 
  action: (payload: FormData) => void, 
  message: string, 
  className?: string, 
  children: React.ReactNode 
}) {
  return (
    <form 
      action={action} 
      onSubmit={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
      className="inline-block"
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}