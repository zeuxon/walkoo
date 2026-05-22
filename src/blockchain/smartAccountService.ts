import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { entryPoint07Address } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { getWalletPrivateKey } from './walletService';
import { RPC_URL, PIMLICO_API_KEY, PIMLICO_RPC_URL } from './config';

type SimpleAccount = Awaited<ReturnType<typeof toSimpleSmartAccount>>;
type SmartAccountClient = Awaited<ReturnType<typeof createSmartAccountClient>>;

interface ClientBundle {
  client: SmartAccountClient;
  account: SimpleAccount;
}

let cachedBundle: ClientBundle | null = null;
let creationPromise: Promise<ClientBundle> | null = null;

export const isPimlicoConfigured = (): boolean =>
  !PIMLICO_API_KEY.startsWith('PASTE');

const getBundle = async (): Promise<ClientBundle> => {
  if (cachedBundle) return cachedBundle;

  if (!creationPromise) {
    creationPromise = (async (): Promise<ClientBundle> => {
      const privateKey = await getWalletPrivateKey();
      if (!privateKey) throw new Error('[SmartAccount] No wallet private key found');

      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(RPC_URL),
      });

      const owner = privateKeyToAccount(privateKey as `0x${string}`);

      const account = await toSimpleSmartAccount({
        client: publicClient,
        owner,
        entryPoint: { address: entryPoint07Address, version: '0.7' },
      });

      const pimlicoClient = createPimlicoClient({
        transport: http(PIMLICO_RPC_URL),
        entryPoint: { address: entryPoint07Address, version: '0.7' },
      });

      const client = createSmartAccountClient({
        account,
        chain: polygonAmoy,
        bundlerTransport: http(PIMLICO_RPC_URL),
        paymaster: pimlicoClient,
        userOperation: {
          estimateFeesPerGas: async () =>
            (await pimlicoClient.getUserOperationGasPrice()).fast,
        },
      });

      return (cachedBundle = { client, account });
    })().catch((err) => {
      creationPromise = null;
      throw err;
    });
  }

  return creationPromise;
};

export const getSmartAccountAddress = async (): Promise<string | null> => {
  if (!isPimlicoConfigured()) return null;
  try {
    const { account } = await getBundle();
    return account.address;
  } catch {
    return null;
  }
};

export const clearSmartAccountCache = (): void => {
  cachedBundle = null;
  creationPromise = null;
};

export const sendSponsoredTx = async (
  to: string,
  data: string,
): Promise<string | null> => {
  if (!isPimlicoConfigured()) return null;
  const { client, account } = await getBundle();
  return client.sendTransaction({
    to: to as `0x${string}`,
    data: data as `0x${string}`,
    account,
    chain: null,
  });
};
