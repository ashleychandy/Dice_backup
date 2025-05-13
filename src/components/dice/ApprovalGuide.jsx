import React from 'react';
import { motion } from 'framer-motion';

const ApprovalGuide = ({ onApproveClick, isApproving }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 border border-yellow-100 rounded-lg p-5 mb-6"
    >
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        First Time Playing?
      </h3>
      <p className="text-yellow-700 mb-3">
        Before placing your first bet, you need to approve the game to use your
        GAMA tokens. This is a one-time process required by the blockchain.
      </p>

      <div className="bg-white p-4 rounded border border-yellow-200 mb-4">
        <h4 className="font-medium text-secondary-700 mb-2">
          What is token approval?
        </h4>
        <p className="text-sm text-secondary-600">
          Token approval is a security feature of blockchain tokens. It gives
          permission to the game contract to transfer tokens from your wallet
          when you place bets. You&apos;ll need to sign a transaction in your
          wallet to complete this process.
        </p>
      </div>

      <button
        onClick={onApproveClick}
        disabled={isApproving}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          isApproving
            ? 'bg-yellow-200 text-yellow-700 cursor-not-allowed'
            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
        }`}
      >
        {isApproving ? (
          <div className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-yellow-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Approving...
          </div>
        ) : (
          'Approve GAMA Tokens'
        )}
      </button>

      <p className="text-xs text-yellow-600 mt-2 text-center">
        This will open your wallet for confirmation
      </p>
    </motion.div>
  );
};

export default ApprovalGuide;
