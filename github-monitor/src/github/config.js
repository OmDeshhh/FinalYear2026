export const GITHUB_TOKEN = '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'; 
export const getHeaders = () => ({
  'Accept': 'application/vnd.github.v3+json'
});
export const getAuthHeaders = () => ({
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `token ${GITHUB_TOKEN}`
});