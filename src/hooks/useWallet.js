/**
 * Re-export the useWallet hook from WalletProvider
 * This maintains backward compatibility with existing code
 */
import { useWallet } from '../components/wallet/WalletProvider';

export { useWallet };
export default useWallet;
