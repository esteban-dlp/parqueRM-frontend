import { apiClient, unwrap } from './client'

export interface DataResetPrepareResult {
  nonce: string
}

export const prepareDataReset = (confirmationWord: string): Promise<DataResetPrepareResult> =>
  apiClient
    .post('/system/data-reset/prepare', { confirmationWord })
    .then(unwrap<DataResetPrepareResult>)

export const executeDataReset = (nonce: string, adminPassword: string): Promise<null> =>
  apiClient
    .post('/system/data-reset/execute', { nonce, adminPassword })
    .then(unwrap<null>)
