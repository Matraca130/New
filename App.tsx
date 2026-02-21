import React from 'react';
// @refresh reset
import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes.tsx';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
