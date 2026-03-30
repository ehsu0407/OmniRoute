type JsonRecord = Record<string, unknown>;

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizeChatUsageToResponsesUsage(usage: unknown): JsonRecord | null {
  const usageRecord = toRecord(usage);
  if (Object.keys(usageRecord).length === 0) return null;

  const promptDetails = toRecord(usageRecord.prompt_tokens_details);
  const completionDetails = toRecord(usageRecord.completion_tokens_details);

  const inputTokens =
    usageRecord.input_tokens !== undefined
      ? toNumber(usageRecord.input_tokens)
      : toNumber(usageRecord.prompt_tokens);
  const outputTokens =
    usageRecord.output_tokens !== undefined
      ? toNumber(usageRecord.output_tokens)
      : toNumber(usageRecord.completion_tokens);
  const cacheReadTokens =
    usageRecord.cache_read_input_tokens !== undefined
      ? toNumber(usageRecord.cache_read_input_tokens)
      : toNumber(promptDetails.cached_tokens);
  const cacheCreationTokens =
    usageRecord.cache_creation_input_tokens !== undefined
      ? toNumber(usageRecord.cache_creation_input_tokens)
      : toNumber(promptDetails.cache_creation_tokens);
  const reasoningTokens =
    usageRecord.reasoning_tokens !== undefined
      ? toNumber(usageRecord.reasoning_tokens)
      : toNumber(completionDetails.reasoning_tokens);

  const promptTokens = toNumber(usageRecord.prompt_tokens) || inputTokens + cacheReadTokens + cacheCreationTokens;
  const completionTokens = toNumber(usageRecord.completion_tokens) || outputTokens;
  const totalTokens = toNumber(usageRecord.total_tokens) || promptTokens + completionTokens;

  const result: JsonRecord = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
  };

  if (cacheReadTokens > 0 || cacheCreationTokens > 0) {
    const inputDetails: JsonRecord = {};
    const promptTokenDetails: JsonRecord = {};
    if (cacheReadTokens > 0) {
      inputDetails.cached_tokens = cacheReadTokens;
      promptTokenDetails.cached_tokens = cacheReadTokens;
      result.cache_read_input_tokens = cacheReadTokens;
    }
    if (cacheCreationTokens > 0) {
      promptTokenDetails.cache_creation_tokens = cacheCreationTokens;
      result.cache_creation_input_tokens = cacheCreationTokens;
    }
    if (Object.keys(inputDetails).length > 0) {
      result.input_tokens_details = inputDetails;
    }
    if (Object.keys(promptTokenDetails).length > 0) {
      result.prompt_tokens_details = promptTokenDetails;
    }
  }

  if (reasoningTokens > 0) {
    result.reasoning_tokens = reasoningTokens;
    result.output_tokens_details = { reasoning_tokens: reasoningTokens };
    result.completion_tokens_details = { reasoning_tokens: reasoningTokens };
  }

  return result;
}
