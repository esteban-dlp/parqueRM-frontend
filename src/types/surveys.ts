export type SurveyAnswerType = 'SCALE_1_5' | 'SCALE_1_10' | 'EMOJI'

export interface SurveyQuestion {
  id: number
  text: string
  answerType: SurveyAnswerType
  displayOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string | null
}

export interface CreateSurveyQuestionDto {
  text: string
  answerType: SurveyAnswerType
  displayOrder?: number
}

export type UpdateSurveyQuestionDto = Partial<CreateSurveyQuestionDto>

export interface ReorderSurveyQuestionsDto {
  items: { id: number; displayOrder: number }[]
}

export interface SubmitSurveyAnswerDto {
  questionId: number
  value: number
}

export interface SubmitSurveyResponseDto {
  answers: SubmitSurveyAnswerDto[]
  generalComment?: string
}
