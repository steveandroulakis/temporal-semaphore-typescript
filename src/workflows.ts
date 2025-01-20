import { proxyActivities, defineUpdate, setHandler } from '@temporalio/workflow';
import { sleep } from '@temporalio/workflow';

import type * as activities from '../src/activities';
import type { Order } from '../src/interfaces/order';

const { processPayment, reserveInventory, deliverOrder } = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 seconds',
    retry: { nonRetryableErrorTypes: ['CreditCardExpiredException'] }
});

// Define an update that takes a string as an ID
export const startChildWorkflow = defineUpdate<string, [string]>('startChildWorkflow');

export async function OrderTimeWindowWorkflow(timeWindow: number): Promise<string> {
    console.log(`Running OrderTimeWindowWorkflow with a time window of ${timeWindow} minutes.`);

    // Register the handler for the 'startChildWorkflow' update
    setHandler(startChildWorkflow, async (id: string) => {
        console.log(`Starting child workflow with ID: ${id}`);
        await startChildWorkflowExecution(id);
        return `Child workflow with ID: ${id} started.`;
    });

    // Simulate some workflow logic
    await new Promise(resolve => setTimeout(resolve, timeWindow * 60 * 1000));
    return `Order processing completed in ${timeWindow} minutes.`;
}

// Function to start a child workflow
async function startChildWorkflowExecution(id: string) {
    await OrderChild(id);
}

// Child workflow definition
export async function OrderChild(id: string): Promise<void> {
    console.log(`Running OrderChild workflow with ID: ${id}`);
    await sleep(5000); // Run a timer for 5 seconds
    console.log(`OrderChild workflow with ID: ${id} completed.`);
}
