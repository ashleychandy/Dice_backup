import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VrfStatus = ({ isVrfPending, vrfRequestId, gameStatus }) => {
  const [shouldShow, setShouldShow] = useState(isVrfPending);

  // Add timer to keep component visible briefly after completion
  useEffect(() => {
    if (isVrfPending) {
      setShouldShow(true);
    } else if (shouldShow) {
      // When VRF is no longer pending but we're showing the component,
      // start a timer to hide it smoothly
      const timer = setTimeout(() => {
        setShouldShow(false);
      }, 3000); // Keep visible for 3 seconds after completion

      return () => clearTimeout(timer);
    }
  }, [isVrfPending, shouldShow]);

  const getStatusMessage = () => {
    if (!gameStatus) return 'Waiting for VRF result...';

    if (gameStatus.requestProcessed) {
      return 'VRF request fulfilled, processing result...';
    }

    if (gameStatus.requestExists) {
      return 'VRF request pending...';
    }

    return 'Waiting for VRF result...';
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 right-4 z-50 bg-white shadow-lg border border-[#22AD74]/20 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            {isVrfPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#22AD74] border-t-transparent" />
            ) : (
              <div className="h-4 w-4 bg-[#22AD74] rounded-full flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-3 h-3 text-white"
                  stroke="currentColor"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
            <div className="text-gray-800 text-sm">
              {!isVrfPending ? 'VRF result received!' : getStatusMessage()}
              <div className="text-xs text-gray-500">
                Request ID: {vrfRequestId?.slice(0, 8)}...
                {gameStatus?.requestExists && (
                  <span className="ml-2">
                    ({gameStatus.requestProcessed ? 'Fulfilled' : 'Pending'})
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VrfStatus;
