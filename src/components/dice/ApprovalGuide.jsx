import React from 'react';
import { motion } from 'framer-motion';

const ApprovalGuide = ({ onApproveClick, isApproving }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-purple-50/70 border border-purple-100 rounded-lg p-5 mb-6 backdrop-blur-sm"
    >
      <h3 className="text-lg font-semibold text-purple-800 mb-2">
        Ready to Start Playing?
      </h3>
      <p className="text-purple-700 mb-3">
        Before placing your first bet, you need to approve the game to use your
        tokens. This is a one-time setup required for security.
      </p>

      <div className="bg-white/80 p-4 rounded border border-purple-200 mb-4">
        <h4 className="font-medium text-secondary-700 mb-2">
          What is token approval?
        </h4>
        <p className="text-sm text-secondary-600">
          Token approval is a security feature that gives permission to the game
          to transfer tokens when you place bets. You&apos;ll simply need to
          confirm this transaction in your wallet.
        </p>
      </div>

      <button
        onClick={onApproveClick}
        disabled={isApproving}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          isApproving
            ? 'bg-purple-200/70 text-purple-700 cursor-not-allowed'
            : 'bg-purple-500/80 hover:bg-purple-600 text-white backdrop-blur-sm'
        }`}
      >
        {isApproving ? (
          <div className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-purple-700"
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
            Approving tokens...
          </div>
        ) : (
          'Approve Tokens to Play'
        )}
      </button>

      <p className="text-xs text-purple-600 mt-2 text-center">
        This will open your wallet for a quick confirmation
      </p>
    </motion.div>
  );
};

export default ApprovalGuide;
