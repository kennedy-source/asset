export async function processOcrUpload(input: unknown) {
  return { text: "", data: input };
}

export async function runOcr(input: unknown) {
  return processOcrUpload(input);
}
