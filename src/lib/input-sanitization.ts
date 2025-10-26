import { ApiError } from "./api-error";

const DANGEROUS_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions?/i,
  /disregard\s+(previous|all)\s+instructions?/i,
  /forget\s+(previous|all)\s+instructions?/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /<\s*script\s*>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
];

const SUSPICIOUS_KEYWORDS = [
  "database",
  "password",
  "secret",
  "api key",
  "token",
  "admin",
  "root",
  "delete all",
  "drop table",
  "truncate",
];

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  checkPromptInjection?: boolean;
}

export function sanitizeInput(
  input: string,
  options: SanitizationOptions = {},
): string {
  const {
    maxLength = 5000,
    allowHtml = false,
    checkPromptInjection = true,
  } = options;

  let sanitized = input.trim();

  if (sanitized.length > maxLength) {
    throw new ApiError(
      `Input exceeds maximum length of ${maxLength} characters`,
      400,
    );
  }

  if (sanitized.length === 0) {
    throw new ApiError("Input cannot be empty", 400);
  }

  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  }

  if (checkPromptInjection) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new ApiError(
          "Input contains potentially malicious content",
          400,
          { pattern: pattern.source },
        );
      }
    }

    const lowerInput = sanitized.toLowerCase();
    const foundKeywords = SUSPICIOUS_KEYWORDS.filter((keyword) =>
      lowerInput.includes(keyword),
    );

    if (foundKeywords.length >= 2) {
      console.warn("Suspicious input detected:", {
        keywords: foundKeywords,
        inputPreview: sanitized.substring(0, 100),
      });
    }
  }

  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");
  sanitized = sanitized.replace(/\s+/g, " ");

  return sanitized;
}

export function sanitizeConversationHistory(
  history: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  return history.map((msg) => ({
    role: msg.role === "user" || msg.role === "assistant" ? msg.role : "user",
    content: sanitizeInput(msg.content, { checkPromptInjection: false }),
  }));
}
