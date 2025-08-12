import React from 'react';

interface StartupErrorProps {
  message: string;
}

const StartupError: React.FC<StartupErrorProps> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
    <div className="bg-white p-6 rounded shadow max-w-md text-center">
      <h1 className="text-2xl font-bold mb-4 text-red-600">Application failed to start</h1>
      <p className="text-gray-700 mb-4">An unexpected error occurred during startup:</p>
      <p className="text-gray-700 mb-4">{message}</p>
      <a
        href="https://github.com/TheraWay/TheraWayV3#setup"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        View setup documentation
      </a>
    </div>
  </div>
);

export default StartupError;
