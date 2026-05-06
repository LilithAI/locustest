import { z } from "zod";

export type QuestionType =
  | "mcq"
  | "issue_spotter"
  | "speed_round"
  | "jurisdiction"
  | "document_review"
  | "brief_builder"
  | "ethics"
  | "client_counseling";

export type Difficulty = "easy" | "medium" | "hard";

export type AreaOfLaw =
  | "constitutional"
  | "criminal"
  | "contract"
  | "torts"
  | "corporate"
  | "ip"
  | "labour"
  | "tax"
  | "evidence"
  | "procedure"
  | "family"
  | "property"
  | "administrative"
  | "international"
  | "jurisprudence"
  | "environmental"
  | "other";

export type ChallengeStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived";

export type BarDesignation =
  | "trainee"
  | "junior_associate"
  | "associate"
  | "senior_associate"
  | "partner"
  | "senior_partner"
  | "silk";

// ============= MCQ =============
export const McqOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export const McqPayloadSchema = z
  .object({
    options: z.array(McqOptionSchema).min(2).max(6),
    correct_option_id: z.string().min(1),
  })
  .refine(
    (p) => p.options.some((o) => o.id === p.correct_option_id),
    { message: "correct_option_id must match an option id" },
  );
export const McqAnswerSchema = z.object({
  selected_option_id: z.string().min(1),
});
export type McqPayload = z.infer<typeof McqPayloadSchema>;
export type McqAnswer = z.infer<typeof McqAnswerSchema>;

// ============= Issue Spotter =============
export const IssueOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export const IssueSpotterPayloadSchema = z
  .object({
    issue_options: z.array(IssueOptionSchema).min(3).max(10),
    correct_issue_ids: z.array(z.string().min(1)).min(1),
  })
  .refine(
    (p) => {
      const ids = new Set(p.issue_options.map((o) => o.id));
      return p.correct_issue_ids.every((id) => ids.has(id));
    },
    { message: "correct_issue_ids must all reference issue_options" },
  );
export const IssueSpotterAnswerSchema = z.object({
  selected_issue_ids: z.array(z.string().min(1)),
});
export type IssueSpotterPayload = z.infer<typeof IssueSpotterPayloadSchema>;
export type IssueSpotterAnswer = z.infer<typeof IssueSpotterAnswerSchema>;

// ============= Speed Round =============
export const SpeedRoundQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  aliases: z.array(z.string().min(1)).max(10).optional(),
});
export const SpeedRoundPayloadSchema = z.object({
  questions: z.array(SpeedRoundQuestionSchema).min(5).max(15),
  time_limit_seconds: z.number().int().min(30).max(300),
});
export const SpeedRoundAnswerSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().min(1),
      submitted: z.string(),
    }),
  ),
});
export type SpeedRoundPayload = z.infer<typeof SpeedRoundPayloadSchema>;
export type SpeedRoundAnswer = z.infer<typeof SpeedRoundAnswerSchema>;

// ============= Jurisdiction =============
export const JurisdictionOptionSchema = z.object({
  id: z.string().min(1),
  jurisdiction: z.string().min(1),
  reasoning: z.string().min(1),
});
export const JurisdictionPayloadSchema = z
  .object({
    options: z.array(JurisdictionOptionSchema).min(2).max(5),
    correct_option_id: z.string().min(1),
  })
  .refine(
    (p) => p.options.some((o) => o.id === p.correct_option_id),
    { message: "correct_option_id must match an option id" },
  );
export const JurisdictionAnswerSchema = z.object({
  selected_option_id: z.string().min(1),
});
export type JurisdictionPayload = z.infer<typeof JurisdictionPayloadSchema>;
export type JurisdictionAnswer = z.infer<typeof JurisdictionAnswerSchema>;

// ============= Document Review =============
export const DocReviewSpanSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export const DocReviewCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export const DocReviewCorrectFlagSchema = z.object({
  span_id: z.string().min(1),
  category_id: z.string().min(1),
});
export const DocumentReviewPayloadSchema = z
  .object({
    document_html: z.string().min(1),
    spans: z.array(DocReviewSpanSchema).min(2).max(20),
    categories: z.array(DocReviewCategorySchema).min(1).max(8),
    correct_flags: z.array(DocReviewCorrectFlagSchema).min(1),
  })
  .refine(
    (p) => {
      const sIds = new Set(p.spans.map((s) => s.id));
      const cIds = new Set(p.categories.map((c) => c.id));
      return p.correct_flags.every(
        (f) => sIds.has(f.span_id) && cIds.has(f.category_id),
      );
    },
    { message: "correct_flags must reference real spans + categories" },
  );
export const DocumentReviewAnswerSchema = z.object({
  flagged: z.array(
    z.object({
      span_id: z.string().min(1),
      category_id: z.string().min(1),
    }),
  ),
});
export type DocumentReviewPayload = z.infer<typeof DocumentReviewPayloadSchema>;
export type DocumentReviewAnswer = z.infer<typeof DocumentReviewAnswerSchema>;

// ============= Brief Builder =============
export const BriefMcqOptionSchema = z.object({
  id: z.string().min(1),
  letter: z.string().min(1).max(2),
  title: z.string().min(1),
  desc: z.string().optional().default(""),
  meta: z.string().optional().default(""),
});
export const BriefBlockSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export const BriefStepSchema = z
  .object({
    kind: z.enum(["mcq", "order"]),
    label: z.string().min(1),
    prompt: z.string().min(1),
    options: z.array(BriefMcqOptionSchema).optional(),
    correct_option_id: z.string().optional(),
    blocks: z.array(BriefBlockSchema).optional(),
    correct_order: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (s) => {
      if (s.kind === "mcq") {
        if (!s.options || s.options.length < 2 || !s.correct_option_id) return false;
        return s.options.some((o) => o.id === s.correct_option_id);
      }
      if (s.kind === "order") {
        if (!s.blocks || s.blocks.length < 2 || !s.correct_order) return false;
        const ids = new Set(s.blocks.map((b) => b.id));
        return (
          s.correct_order.length === s.blocks.length &&
          s.correct_order.every((id) => ids.has(id))
        );
      }
      return false;
    },
    { message: "step shape invalid for its kind" },
  );
export const BriefBuilderPayloadSchema = z.object({
  fact_pattern: z.string().min(1),
  citation: z.string().optional().default(""),
  steps: z.array(BriefStepSchema).min(2).max(6),
});
export const BriefStepAnswerSchema = z.object({
  step_index: z.number().int().min(0),
  selected_option_id: z.string().optional(),
  ordered_block_ids: z.array(z.string().min(1)).optional(),
});
export const BriefBuilderAnswerSchema = z.object({
  step_answers: z.array(BriefStepAnswerSchema),
});
export type BriefBuilderPayload = z.infer<typeof BriefBuilderPayloadSchema>;
export type BriefBuilderAnswer = z.infer<typeof BriefBuilderAnswerSchema>;

// ============= Ethics (2-stage MCQ) =============
export const EthicsOptionSchema = z.object({
  id: z.string().min(1),
  letter: z.string().min(1).max(2),
  text: z.string().min(1),
});
export const EthicsPayloadSchema = z
  .object({
    scenario: z.string().min(1),
    decision_options: z.array(EthicsOptionSchema).min(2).max(6),
    correct_decision_id: z.string().min(1),
    consequence_text: z.string().min(1),
    followup_options: z.array(EthicsOptionSchema).min(2).max(6),
    correct_followup_id: z.string().min(1),
    model_reasoning: z.string().min(1),
  })
  .refine(
    (p) =>
      p.decision_options.some((o) => o.id === p.correct_decision_id) &&
      p.followup_options.some((o) => o.id === p.correct_followup_id),
    { message: "correct ids must match options" },
  );
export const EthicsAnswerSchema = z.object({
  selected_decision_id: z.string().min(1),
  selected_followup_id: z.string().min(1),
});
export type EthicsPayload = z.infer<typeof EthicsPayloadSchema>;
export type EthicsAnswer = z.infer<typeof EthicsAnswerSchema>;

// ============= Client Counseling (multi-turn) =============
export const CounselingTranscriptTurnSchema = z.object({
  turn: z.number().int().min(1),
  role: z.enum(["client", "lawyer"]),
  text: z.string().min(1),
});
export const CounselingDecisionTurnSchema = z
  .object({
    turn: z.number().int().min(1),
    prompt: z.string().min(1),
    options: z.array(EthicsOptionSchema).min(2).max(6),
    correct_option_id: z.string().min(1),
    model_followup: z.string().optional().default(""),
  })
  .refine(
    (t) => t.options.some((o) => o.id === t.correct_option_id),
    { message: "correct_option_id must match an option id" },
  );
export const ClientCounselingPayloadSchema = z.object({
  matter: z.string().min(1),
  transcript: z.array(CounselingTranscriptTurnSchema).min(1).max(20),
  decision_turns: z.array(CounselingDecisionTurnSchema).min(1).max(10),
});
export const ClientCounselingAnswerSchema = z.object({
  turn_picks: z.array(
    z.object({
      turn: z.number().int().min(1),
      selected_option_id: z.string().min(1),
      followup_text: z.string().optional().default(""),
    }),
  ),
});
export type ClientCounselingPayload = z.infer<typeof ClientCounselingPayloadSchema>;
export type ClientCounselingAnswer = z.infer<typeof ClientCounselingAnswerSchema>;

// ============= Grading config (per-challenge) =============
export const GradingConfigSchema = z
  .object({
    reasoning_threshold: z.number().int().min(0).max(100).optional(),
    partial_order_credit: z.boolean().optional(),
  })
  .partial();
export type GradingConfig = z.infer<typeof GradingConfigSchema>;

export class GradingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradingError";
  }
}
