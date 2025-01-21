import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Env, getEnv } from './interfaces/env';
import { SemaphoreWorkflow } from './workflows';
import { createClientConnection } from './utils/connection';

// Extended Env interface to include API key
interface EnvWithApiKey extends Env {
  clientApiKey?: string;
}

/**
 * Schedule a Workflow connecting with either mTLS or API key authentication.
 * Configuration is provided via environment variables.
 * 
 * For mTLS: Requires clientCertPath and clientKeyPath
 * For API key: Requires clientApiKey
 * Note that serverNameOverride and serverRootCACertificate are optional.
 */
async function run({
  address,
  namespace,
  clientCertPath,
  clientKeyPath,
  clientApiKey,
  serverNameOverride,
  serverRootCACertificatePath,
  taskQueue,
}: EnvWithApiKey, timeWindow: number) {
  const client = await createClientConnection({
    address,
    namespace,
    clientCertPath,
    clientKeyPath,
    clientApiKey,
    serverNameOverride,
    serverRootCACertificatePath,
    taskQueue
  });

  await client.workflow.execute(SemaphoreWorkflow, {
    taskQueue,
    workflowId: `semaphore-workflow`,
    args: [timeWindow],
  });
}

// Rest of the code remains unchanged
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const argv = yargs(hideBin(process.argv)).options({
  timeWindow: { type: 'number', alias: 't', demandOption: true }
}).argv as { timeWindow: number };

run(getEnv(), argv.timeWindow).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);