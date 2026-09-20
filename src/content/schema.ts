import { z } from "zod";
import { TRACK_IDS } from "../domain/types";

const id = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9][a-z0-9._-]*$/);
const text = z.string().trim().min(1);
const strings = z.array(text).min(1);
const url = z
  .string()
  .url()
  .refine((value) => {
    const parsed = new URL(value);
    return (
      ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    );
  }, "Use an official web source without embedded credentials");
const secureUrl = url.refine(
  (value) => value.startsWith("https://"),
  "Embedded or hosted assets must use HTTPS",
);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const resourceSchema = z
  .object({
    id,
    kind: z.enum(["video", "book", "documentation", "practice"]),
    title: text,
    url,
    provider: text,
    access: z.enum(["free", "free-account", "paid-optional"]),
    license: text,
    licenseUrl: url.nullable(),
    redistribution: z.enum(["permitted", "link-only"]),
    downloadUrl: secureUrl.nullable(),
    verifiedOn: date,
    notes: z.string(),
    hostedPath: z
      .string()
      .regex(/^books\/[a-zA-Z0-9._-]+\.pdf$/)
      .optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    embedUrl: secureUrl.optional(),
  })
  .passthrough()
  .superRefine((resource, context) => {
    if (resource.redistribution === "permitted" && !resource.licenseUrl) {
      context.addIssue({
        code: "custom",
        message: "Redistribution needs affirmative license evidence",
      });
    }
    if (
      resource.hostedPath &&
      (resource.redistribution !== "permitted" || !resource.sha256)
    ) {
      context.addIssue({
        code: "custom",
        message: "Hosted books need permission and a checksum",
      });
    }
  });

export const questionSchema = z
  .object({
    id,
    prompt: text,
    kind: z.enum([
      "single-choice",
      "multiple-choice",
      "numeric",
      "short-answer",
    ]),
    choices: z.array(text).optional(),
    answer: z.union([
      z.string(),
      z.number(),
      z.array(z.string()),
      z.array(z.number()),
    ]),
    explanation: text,
    numericTolerance: z.number().finite().min(0).optional(),
    marks: z.number().finite().positive().optional(),
    examStyle: z.string().optional(),
    paperTags: z.array(text).optional(),
  })
  .passthrough();

export const lessonSchema = z
  .object({
    id,
    title: text,
    objectives: strings,
    topics: z
      .array(z.object({ title: text, details: strings }).passthrough())
      .min(1),
    estimatedMinutes: z.number().int().min(10).max(1800),
    canonicalConceptTags: z.array(text),
    video: z.object({ resourceId: id, locator: text }).passthrough(),
    reading: z.object({ resourceId: id, locator: text }).passthrough(),
    supplementaryResourceIds: z.array(id).default([]),
    assignment: z
      .object({
        id,
        title: text,
        kind: z.enum([
          "coding",
          "problem-set",
          "design",
          "lab",
          "quiz",
          "project",
        ]),
        instructions: strings,
        deliverables: strings,
        acceptanceCriteria: strings,
        externalUrl: url.nullable().default(null),
        questions: z.array(questionSchema).default([]),
      })
      .passthrough(),
    reviewPrompts: strings,
    prerequisites: z.array(id).default([]),
    paperTags: z.array(text).default([]),
    optional: z.boolean().default(false),
  })
  .passthrough();

export const trackSchema = z
  .object({
    schemaVersion: z.literal(1),
    trackId: z.enum(TRACK_IDS),
    title: text,
    sourceCheckedOn: date,
    resources: z.array(resourceSchema).min(2),
    modules: z
      .array(
        z
          .object({
            id,
            title: text,
            stage: z.enum([
              "foundation",
              "intermediate",
              "advanced",
              "professional",
            ]),
            description: text,
            prerequisites: z.array(id),
            paperTags: z.array(text).default([]),
            lessons: z.array(lessonSchema).min(1),
            optional: z.boolean().default(false),
          })
          .passthrough(),
      )
      .min(1),
    projectMappings: z
      .array(
        z
          .object({
            projectTitle: text,
            resumeVariant: z.enum([
              "A-rebuild",
              "B-build",
              "professional-synthetic-recreation",
            ]),
            recommendedAfter: z.array(id),
            milestones: z.array(
              z
                .object({
                  title: text,
                  deliverables: strings,
                  acceptanceCriteria: strings,
                })
                .passthrough(),
            ),
          })
          .passthrough(),
      )
      .default([]),
    sources: z.array(
      z
        .object({ title: text, url, notes: z.string().optional() })
        .passthrough(),
    ),
    limitations: z.array(text),
    edition: z.string().optional(),
  })
  .passthrough();
