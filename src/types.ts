export enum OpenAIModel {
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini"
  // To add a new model, simply add it here:
  // GPT_4_TURBO = "gpt-4-turbo",
  // GPT_3_5_TURBO = "gpt-3.5-turbo"
}

export const AVAILABLE_MODELS = [
  {
    value: OpenAIModel.GPT_4O,
    label: "GPT-4o",
    description: "Best quality"
  },
  {
    value: OpenAIModel.GPT_4O_MINI,
    label: "GPT-4o-mini",
    description: "Cost-effective, higher token limit"
  }
  // To add a new model, add it here:
  // {
  //   value: OpenAIModel.GPT_4_TURBO,
  //   label: "GPT-4 Turbo",
  //   description: "Fast and capable"
  // }
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number]["value"];
