import React, { useState } from 'react';
import IntroScreen from './IntroScreen';

const IntroScreenTest = () => {
  const [showIntro, setShowIntro] = useState(true);

  const handleComplete = () => {
    setShowIntro(false);
    console.log('Intro completed');
  };

  const resetIntro = () => {
    setShowIntro(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {showIntro ? (
        <IntroScreen onComplete={handleComplete} />
      ) : (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#22AD74] mb-4">
            Welcome to the Main App
          </h1>
          <p className="text-gray-700 mb-6">
            The intro screen has been dismissed.
          </p>
          <button
            onClick={resetIntro}
            className="px-6 py-3 bg-gradient-to-r from-[#22AD74] to-[#26c582] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Show Intro Again
          </button>
        </div>
      )}
    </div>
  );
};

export default IntroScreenTest;
