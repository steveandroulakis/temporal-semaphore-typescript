import { proxyActivities, defineUpdate, setHandler, executeChild, 
    ParentClosePolicy, sleep, condition } from '@temporalio/workflow';

import type * as activities from '../src/activities';

const { processPayment, reserveInventory, deliverOrder } = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 seconds',
    retry: { nonRetryableErrorTypes: ['CreditCardExpiredException'] }
});

// Define an update that takes a string as an ID
export const startChildWorkflow = defineUpdate<string, [string]>('startChildWorkflow');

export async function OrderTimeWindowWorkflow(timeWindow: number): Promise<string> {
    const MAX_CHILD_EXECUTIONS = 3; // Maximum allowed child workflow executions
    const timeWindowMs = timeWindow * 60 * 1000;
    const workflowQueue: string[] = [];
    let startTime = Date.now();
    let completedWorkflows = 0;
    let childExecutionCount = 0;
    let executingOrQueued = 'EXECUTING';
    let queueDepth = 0;
    
    console.log(`Running OrderTimeWindowWorkflow with a time window of ${timeWindow} minutes.`);

    // Register the handler for the 'startChildWorkflow' update
    setHandler(startChildWorkflow, async (id: string): Promise<string> => {
        if (childExecutionCount >= MAX_CHILD_EXECUTIONS) {
            console.log(`Rejected workflow with ID: ${id} - exceeds maximum of ${MAX_CHILD_EXECUTIONS} child executions`);
            return JSON.stringify({
                response: 'REJECTED',
                queueDepth: childExecutionCount
            }, null, 0);
        }

        // console.log(`DEBUG: workflowQueue.length: ${workflowQueue.length}`);
        // console.log(`DEBUG: executingOrQueued: ${executingOrQueued}`);
        workflowQueue.push(id);
        queueDepth++;
        childExecutionCount++;
        console.log(`Added workflow with ID: ${id} to the queue.`);
        console.log(`Current workflow queue: ${workflowQueue.length} items.`);
        return JSON.stringify({
            // If queue already had items before pushing, then this one gets queued
            response: executingOrQueued,
            queueDepth: queueDepth
        }, null, 0);
    });

    // Create initial sleep promise
    let timeoutPromise = sleep(timeWindowMs);

    // Process workflows from the queue
    while (true) {
        const timeLeftMs = timeWindowMs - (Date.now() - startTime);
        const timeLeftSec = Math.floor(timeLeftMs / 1000);

        // Wait for either queue to be non-empty or timeout
        await Promise.race([
            condition(() => workflowQueue.length > 0),
            timeoutPromise
        ]);
        
        if (workflowQueue.length === 0) {
            console.log(`Time window expired, resetting ${timeWindow} minute time window.`);
            childExecutionCount = 0;
            timeoutPromise = sleep(timeWindowMs);
            startTime = Date.now();
            continue;
        }

        console.log(`Time left in window: ${timeLeftSec} seconds`);

        const id = workflowQueue.shift(); // This removes the first ID from workflowQueue
        if (id) {
            console.log(`Processing workflow with ID: ${id}`);
            
            executingOrQueued = 'QUEUED';
            await executeChild(OrderChild, {
                args: [id],
                workflowId: `order-child-${id}`,
                parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_REQUEST_CANCEL
            });
            executingOrQueued = 'EXECUTING';
            queueDepth--;

            completedWorkflows++;
            console.log(`Workflow with ID: ${id} completed. Total completed workflows: ${completedWorkflows}`);
            console.log(`Current workflow queue: ${workflowQueue.length} items.`);
        }
    }
}

// Child workflow definition
export async function OrderChild(id: string): Promise<void> {
    console.log(`Running OrderChild workflow with ID: ${id}`);
    await sleep(5000); // Run a timer for 5 seconds
    console.log(`OrderChild workflow with ID: ${id} completed.`);
}
