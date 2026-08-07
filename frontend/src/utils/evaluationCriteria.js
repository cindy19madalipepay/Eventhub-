// frontend/src/utils/evaluationCriteria.js
//
// Must match backend/config/evaluationCriteria.js exactly — this is what
// renders the rubric table in EvaluationModal.jsx.

export const EVALUATION_CRITERIA = [
  {
    section: 'A. Preparation',
    items: [
      { key: 'A1', label: 'Length of time' },
      { key: 'A2', label: 'Schedule of Practice' },
    ],
  },
  {
    section: 'B. Objective of the activity',
    items: [
      { key: 'B1', label: 'To what extent were your expectations of the program/activity met?' },
      { key: 'B2', label: 'To what extent the sponsoring group attained the objectives of the activities?' },
    ],
  },
  {
    section: 'C. Administrative Support',
    items: [
      { key: 'C1', label: 'Have adequate facilities to be used by the students.' },
      { key: 'C2', label: 'Has close supervision of the teacher adviser.' },
      { key: 'C3', label: 'Adequacy of supplies and financial support when needed.' },
    ],
  },
  {
    section: 'D. Activity Conducted',
    items: [
      { key: 'D1', label: 'System and orderliness of the activity' },
      { key: 'D2', label: 'Relevance to the theme.' },
      { key: 'D3', label: 'Usefulness of information elicited by the activity.' },
      { key: 'D4', label: 'Adequacy and quality of the numbers presented.' },
      { key: 'D5', label: 'Suitability of venue.' },
      { key: 'D6', label: 'Ability to catch attention from the audience.' },
    ],
  },
];

export const ALL_CRITERIA_KEYS = EVALUATION_CRITERIA.flatMap((s) => s.items.map((i) => i.key));

export const RATING_LEGEND = [
  { value: 5, label: 'Excellent' },
  { value: 4, label: 'Very Satisfactory' },
  { value: 3, label: 'Satisfactory' },
  { value: 2, label: 'Fair' },
  { value: 1, label: 'Poor' },
];