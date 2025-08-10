import React from 'react';

interface StartupErrorProps {
  message: string;
}

const StartupError: React.FC<StartupErrorProps> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
    <div className="bg-white p-6 rounded shadow max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
      <p className="text-gray-700">{message}</p>
    </div>
  </div>
);

export default StartupError;
