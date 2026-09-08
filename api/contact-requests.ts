import { handleLeadRequest, type ApiRequest, type ApiResponse } from './_lib/leadHandler.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  await handleLeadRequest('contact', request, response);
}
