export async function processSyncQueue() {
  return { processed: 0 };
}

export async function enqueueSyncItem(input: unknown) {
  return input;
}

export const enqueueMutation = enqueueSyncItem;
export const processPendingMutations = processSyncQueue;
export async function retryFailedMutations() {
  return { retried: 0 };
}
