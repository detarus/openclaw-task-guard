export type KnownIncidentType =
  | "gateway-restart-interrupt"
  | "browser-start-interrupt"
  | "missing-tool-result";

export type FollowupRule = {
  incidentType: KnownIncidentType;
  verifyCommand: string;
  followupTemplate: string;
  maxAttempts: number;
};

export type FollowupPlan = FollowupRule & {
  attemptCount: number;
  shouldRun: boolean;
  reason: string;
};

const RULES: Record<KnownIncidentType, FollowupRule> = {
  "gateway-restart-interrupt": {
    incidentType: "gateway-restart-interrupt",
    verifyCommand: "openclaw gateway status",
    followupTemplate: "Похоже, прошлый шаг мог оборваться на рестарте. Перепроверил: gateway уже поднялся, продолжаю.",
    maxAttempts: 1,
  },
  "browser-start-interrupt": {
    incidentType: "browser-start-interrupt",
    verifyCommand: "openclaw browser status",
    followupTemplate: "Похоже, запуск браузера мог оборваться. Перепроверил текущий browser status.",
    maxAttempts: 1,
  },
  "missing-tool-result": {
    incidentType: "missing-tool-result",
    verifyCommand: "openclaw gateway status",
    followupTemplate: "Похоже, промежуточный результат потерялся. Перепроверил итог напрямую и продолжаю с актуального статуса.",
    maxAttempts: 1,
  },
};

export function listKnownFollowupRules() {
  return Object.values(RULES);
}

export function planAutoFollowup(params: {
  incidentType: KnownIncidentType;
  attemptCount?: number;
}) : FollowupPlan {
  const rule = RULES[params.incidentType];
  const attemptCount = params.attemptCount ?? 0;

  if (!rule) {
    return {
      incidentType: params.incidentType,
      verifyCommand: "",
      followupTemplate: "",
      maxAttempts: 0,
      attemptCount,
      shouldRun: false,
      reason: "unknown-incident-type",
    };
  }

  if (attemptCount >= rule.maxAttempts) {
    return {
      ...rule,
      attemptCount,
      shouldRun: false,
      reason: "attempt-limit-reached",
    };
  }

  return {
    ...rule,
    attemptCount,
    shouldRun: true,
    reason: "known-incident-one-shot-followup",
  };
}
