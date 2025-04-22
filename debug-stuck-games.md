# Debugging Stuck Games

This guide provides instructions on how to debug games that get stuck in the Dice application.

## Understanding Stuck Games

A game can get "stuck" for several reasons:

- The transaction was submitted but the Chainlink VRF callback never happened
- The transaction was mined but the game state wasn't properly updated
- There was a network issue during the game process
- The contract has a timeout mechanism that wasn't triggered

## How to Use the Debug Logs

1. **Watch the console for game lifecycle events:**

   - Open your browser developer console (F12 or Ctrl+Shift+I)
   - Look for logs with these prefixes:
     - `GameService DEBUG: Placing bet` - When a bet is placed
     - `GameService DEBUG: Checking recovery eligibility` - Recovery checks
     - `GameStats DEBUG: Recovery check result` - Recovery status

2. **Key information to track:**
   - `isActive` - If true, a game is currently in progress
   - `recoveryEligible` - If true, a game can be recovered
   - `timeSinceLastPlay` - Time elapsed since the last game
   - Transaction hashes - To check on the blockchain explorer

## Diagnosing Common Issues

### 1. Game Started But Never Completed

Look for:

- `GameService DEBUG: Bet transaction confirmed` log showing the transaction was mined
- `GameStats DEBUG: Recovery check result` showing `isActive: true` but no completion

Possible causes:

- Chainlink VRF callback issue
- Contract logic error
- Network issues during callback processing

### 2. Multiple Active Games

Look for:

- Warning: `GameService DEBUG: Attempting to place bet while another game is active!`
- This indicates an attempt to start a new game before the previous one finished

### 3. False Recovery Eligibility

Look for:

- Mismatch between `isActive` and `recoveryEligible` in the logs
- Games showing as eligible for recovery when they shouldn't be

## Testing Recovery Functionality

1. After a game appears stuck, check the recovery eligibility:

   - Watch for `GameStats DEBUG: Recovery check result` logs
   - Confirm `eligible: true` appears in the logs

2. When clicking the recovery button:
   - `GameStats DEBUG: Attempting to recover game` should appear
   - `GameService DEBUG: Calling recoverOwnStuckGame on contract` confirms the call
   - `GameService DEBUG: Recovery transaction confirmed` shows success

## When to Contact Support

If you see:

- `GameService DEBUG: Error recovering game` repeatedly
- Recovery transactions confirmed but game still shows as active
- Games stuck in an unrecoverable state after multiple recovery attempts

## How to Remove Debug Logs

Once you've identified and fixed issues, remove the debugging code:

1. Search for comments with `// DEBUG LOGS - REMOVE AFTER DEBUGGING` in:

   - `src/services/gameService.js`
   - `src/components/dice/GameStats.jsx`

2. Remove each debug log line and the comment.

3. This debugging is specifically focused on game state and recovery - for general app debugging, refer to the main debugging guide.
