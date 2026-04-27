import { createWalletClient, http, erc20Abi, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const rpcUrl = process.env.TOKEN_RPC_URL
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS as `0x${string}` | undefined
const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY as `0x${string}` | undefined
const chainId = Number(process.env.TOKEN_CHAIN_ID || 1)
const tokenDecimals = Number(process.env.TOKEN_DECIMALS || 18)
const tokenSymbol = process.env.TOKEN_SYMBOL || 'ILC'

export const getTokenTransferConfig = () => ({
  configured: Boolean(rpcUrl && tokenAddress && treasuryPrivateKey),
  tokenSymbol,
  tokenDecimals,
})

export const sendTokenToWallet = async (walletAddress: string, amount: string): Promise<string> => {
  if (!rpcUrl || !tokenAddress || !treasuryPrivateKey) {
    throw new Error('토큰 전송 환경변수가 설정되지 않았습니다.')
  }
  const account = privateKeyToAccount(treasuryPrivateKey)
  const client = createWalletClient({
    account,
    chain: {
      id: chainId,
      name: `chain-${chainId}`,
      nativeCurrency: { name: 'Native', symbol: 'NATIVE', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(rpcUrl),
  })

  const hash = await client.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [walletAddress as `0x${string}`, parseUnits(amount, tokenDecimals)],
  })
  return hash
}
