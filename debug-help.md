# Debugging Guide for Empty Game History

This guide will help you diagnose why your game history is empty.

## How to Use the Debug Logs

1. **Look for patterns in the console logs:**

   - Open your browser's developer console (F12 or Ctrl+Shift+I)
   - Look for logs starting with:
     - `GameHistory:` - Shows what happens in the history component
     - `GameService DEBUG:` - Shows what happens in the game service
     - `DEBUG CONTRACT INIT:` - Shows contract initialization status

2. **Key diagnostic information to look for:**
   - Is the wallet connected? Check for `account` values in the logs
   - Is the contract initialized? Look for `Contract initialized` logs
   - Does the contract have the right address? Check `diceAddress` values
   - Is `getBetHistory` being called? Look for `Attempting to call getBetHistory`
   - What error occurs? Check for error logs

## Common Issues and Solutions

1. **Contract Not Initialized:**

   - If you see `No contract or account, returning empty data`, check if contracts are properly loaded
   - Make sure you're connected to the correct network (Apothem testnet or mainnet)

2. **Contract Address Missing:**

   - If you see `Contract address not configured`, check your environment variables
   - Make sure the right contract addresses are set in `.env` file

3. **Empty Bet History:**

   - If you see `Empty history detected from BAD_DATA`, this means you haven't played any games yet
   - Try playing a game first, then check history

4. **ABI Mismatch:**
   - If you see errors about function calls, check if the contract ABI matches the deployed contract
   - Verify that `getBetHistory` is in the ABI

## How to Remove Debug Logs

Once you've identified and fixed the issue, you can easily remove all debugging code by:

1. Search for the comment `// DEBUG LOGS - REMOVE AFTER DEBUGGING` in:

   - `src/components/dice/GameHistory.jsx`
   - `src/services/gameService.js`
   - `src/utils/walletUtils.js`

2. Remove each debug log line along with the comment.

3. Restore any original console logs that were modified (check git diff if needed).

If you want to keep some logs for future debugging, consider making them conditional based on a debug flag, for example:

```javascript
// At the top of the file
const DEBUG = false;

// Then in your code
if (DEBUG) console.log('Debug info:', someData);
```
