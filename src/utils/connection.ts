import fs from 'fs/promises';
import { Connection, Client } from '@temporalio/client';
import { NativeConnection } from '@temporalio/worker';
import { EnvWithApiKey } from '../interfaces/env';

export async function createClientConnection(env: EnvWithApiKey): Promise<Client> {
  const { address, namespace, clientCertPath, clientKeyPath, clientApiKey, serverNameOverride, serverRootCACertificatePath } = env;
  let connection: Connection | NativeConnection;

  // Check for mTLS certificates first
  if (clientCertPath && clientKeyPath) {
    console.log('Using mTLS authentication');
    const serverRootCACertificate = serverRootCACertificatePath
      ? await fs.readFile(serverRootCACertificatePath)
      : undefined;

    connection = await Connection.connect({
      address,
      tls: {
        serverNameOverride,
        serverRootCACertificate,
        clientCertPair: {
          crt: await fs.readFile(clientCertPath),
          key: await fs.readFile(clientKeyPath),
        },
      },
    });
  }
  // If no mTLS certificates, check for API key
  else if (clientApiKey) {
    console.log('Using API key authentication');
    connection = await Connection.connect({
      address,
      tls: true,
      apiKey: clientApiKey,
      metadata: {
        'temporal-namespace': namespace,
      },
    });
  }
  // Fallback to unencrypted connection (not recommended for production)
  else {
    console.log('Warning: Using unencrypted connection');
    connection = await Connection.connect({ address });
  }

  return new Client({ connection, namespace });
} 