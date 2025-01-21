import { createClientConnection } from './utils/connection';
import { getEnv } from './interfaces/env';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse command-line arguments
const argv = yargs(hideBin(process.argv)).options({
  id: { type: 'string', demandOption: true, describe: 'ID for the update' }
}).parseSync();

async function requestChildWorkflow() {
  const env = getEnv();
  const client = await createClientConnection(env);

  // Use the ID from command-line arguments
  const id = argv.id;

  // Assume the parent workflow ID is known or hard-coded
  const parentWorkflowId = 'order-time-window';

  // Get the handle of the existing parent workflow
  const handle = client.workflow.getHandle(parentWorkflowId);

  // Use the ID in the update
  const prevValue = await handle.executeUpdate('startChildWorkflow', { args: [id] });
  console.log('Response:', prevValue);
}

requestChildWorkflow().catch((err) => {
  console.error(err);
  process.exit(1);
}); 