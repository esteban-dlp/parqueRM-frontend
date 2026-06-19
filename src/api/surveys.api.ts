import { apiClient, unwrap } from './client'
import type { ApiResponse } from '@/types/api'
import type {
  SurveyQuestion,
  CreateSurveyQuestionDto,
  UpdateSurveyQuestionDto,
  ReorderSurveyQuestionsDto,
  SubmitSurveyResponseDto,
} from '@/types/surveys'

export const surveysApi = {
  questions: {
    list: () =>
      apiClient.get<ApiResponse<SurveyQuestion[]>>('/surveys/questions').then(unwrap),

    listActive: () =>
      apiClient.get<ApiResponse<SurveyQuestion[]>>('/surveys/questions/active').then(unwrap),

    create: (dto: CreateSurveyQuestionDto) =>
      apiClient.post<ApiResponse<SurveyQuestion>>('/surveys/questions', dto).then(unwrap),

    update: (id: number, dto: UpdateSurveyQuestionDto) =>
      apiClient.patch<ApiResponse<SurveyQuestion>>(`/surveys/questions/${id}`, dto).then(unwrap),

    toggle: (id: number) =>
      apiClient.patch<ApiResponse<SurveyQuestion>>(`/surveys/questions/${id}/toggle`).then(unwrap),

    reorder: (dto: ReorderSurveyQuestionsDto) =>
      apiClient.patch<ApiResponse<SurveyQuestion[]>>('/surveys/questions/reorder', dto).then(unwrap),
  },

  responses: {
    submit: (dto: SubmitSurveyResponseDto) =>
      apiClient.post<ApiResponse<{ id: number; submittedAt: string }>>('/surveys/responses', dto).then(unwrap),
  },
}
