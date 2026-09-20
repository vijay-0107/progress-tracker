import type { Question } from "../domain/types";

export function QuestionField({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  if (question.kind === "single-choice") {
    return (
      <fieldset className="question-field" disabled={disabled}>
        <legend>{question.prompt}</legend>
        {question.choices?.map((choice, index) => (
          <label
            className={`answer-option ${value === choice ? "selected" : ""}`}
            key={choice}
          >
            <input
              type="radio"
              name={question.id}
              value={choice}
              checked={value === choice}
              onChange={() => onChange(choice)}
            />
            <span className="choice-index">
              {String.fromCharCode(65 + index)}
            </span>
            <span>{choice.replace(/^[A-Z][.)]\s+/, "")}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  if (question.kind === "multiple-choice") {
    const chosen = value ? value.split("\n") : [];
    return (
      <fieldset className="question-field" disabled={disabled}>
        <legend>
          {question.prompt}
          <small>Select all that apply.</small>
        </legend>
        {question.choices?.map((choice) => (
          <label
            className={`answer-option ${chosen.includes(choice) ? "selected" : ""}`}
            key={choice}
          >
            <input
              type="checkbox"
              value={choice}
              checked={chosen.includes(choice)}
              onChange={(event) =>
                onChange(
                  (event.target.checked
                    ? [...chosen, choice]
                    : chosen.filter((item) => item !== choice)
                  ).join("\n"),
                )
              }
            />
            <span>{choice}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label className="question-field">
      <strong>{question.prompt}</strong>
      {question.kind === "short-answer" ? (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Explain in your own words; compare with the model answer after attempting."
        />
      ) : (
        <input
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          maxLength={100}
          placeholder="Your numeric answer"
        />
      )}
    </label>
  );
}
