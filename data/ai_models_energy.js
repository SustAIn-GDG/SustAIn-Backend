// Wh per query
export const AI_MODEL_ENERGY_FACTORS = {
  "GPT-4": {
    "text generation": 2.216784779,
    "text classification": 2.662709103,
    "code generation": 5.541961947,
    summarization: 3.335412515,
    "question answering": 2.44227427,
    "image generation": 248.8557196,
    "image classification": 0.303210732,
  },
  GPT: {
    "text generation": 0.271890051,
    "text classification": 0.326582951,
    "code generation": 0.679725127,
    summarization: 0.409090448,
    "question answering": 0.299546479,
    "image generation": 30.52231093,
    "image classification": 0.037188987,
  },
  Gemini: {
    "text generation": 1.929618348,
    "text classification": 2.317776805,
    "code generation": 4.824045871,
    summarization: 2.903336964,
    "question answering": 2.125897511,
    "image generation": 216.618486,
  },
  Claude: {
    "text generation": 0.31471416,
    "text classification": 0.378021478,
    "code generation": 0.786785399,
    summarization: 0.473524339,
    "question answering": 0.34672662,
    "image generation": 35.32973493,
  },
  "LLaMA 3": {
    "text generation": 0.122342548,
    "text classification": 0.146952749,
    "code generation": 0.305856371,
    summarization: 0.184078703,
    "question answering": 0.13478713,
    "image generation": 13.73414471,
  },
  // "LLaMA 2": {
  //   "text generation": 0.027147029,
  //   "text classification": 0.031601443,
  //   "code generation": 0.067867573,
  //   summarization: 0.039585191,
  //   "question answering": 0.028985288,
  //   "image generation": 2.76369731,
  // },
};
