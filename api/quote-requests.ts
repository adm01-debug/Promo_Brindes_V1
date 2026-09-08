import { handleLeadRequest, type ApiRequest, type ApiResponse } from './_lib/leadHandler';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  await handleLeadRequest('quote', request, response);
}
