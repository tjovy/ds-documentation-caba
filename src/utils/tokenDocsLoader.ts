// src/utils/tokenDocsLoader.ts

// @ts-ignore
const OWNER: string = import.meta.env.STORYBOOK_GITHUB_OWNER || 'tjovy';
// @ts-ignore
const REPO: string = import.meta.env.STORYBOOK_GITHUB_REPO || 'ds-documentation-caba';

// --- INTERFACES TYPESCRIPT ---

export interface BranchItem {
  name: string;
  label?: string;
}

export interface DiffItem {
  path: string;
  original: string | null;
  modified: string;
}

export interface BranchDiffResult {
  diffs: DiffItem[];
  fullBranchDocs: Record<string, any>;
}

export interface SaveResult {
  success: boolean;
  error?: string;
}

// --- HELPERS ---

/**
 * Les lectures restent publiques. Le jeton d'ecriture ne quitte jamais le serveur Vite local.
 */
const githubFetch = async (url: string, accept: string): Promise<Response> => {
  return fetch(url, { headers: { Accept: accept } });
};

const resolveBranchSha = async (branch: string): Promise<string | null> => {
  try {
    const encodedBranch = encodeURIComponent(branch);
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${encodedBranch}`;
    const res = await githubFetch(url, 'application/vnd.github+json');

    if (!res.ok) {
      console.warn(`[tokenDocsLoader] Failed to resolve branch SHA for "${branch}":`, res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    return data?.object?.sha || null;
  } catch (error) {
    console.warn(`[tokenDocsLoader] resolveBranchSha("${branch}") failed:`, error);
    return null;
  }
};

// --- FONCTIONS ---

export const loadTokenDocs = async (branch: string = 'main'): Promise<Record<string, any>> => {
  try {
    const resolvedRef = (await resolveBranchSha(branch)) || branch;
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/tokens-docs.json?ref=${resolvedRef}`;
    console.log(`[tokenDocsLoader] Loading tokens-docs.json from branch "${branch}" via ref "${resolvedRef}"...`);

    const res = await githubFetch(url, 'application/vnd.github.v3.raw');

    if (!res.ok) {
      console.warn(`[tokenDocsLoader] Failed to load tokens-docs.json from "${branch}":`, res.status, res.statusText);
      return {};
    }

    const data = await res.json();
    console.log(`[tokenDocsLoader] Loaded tokens-docs.json from "${branch}":`, Object.keys(data).length, 'top-level keys');
    return data;
  } catch (e) {
    console.error(`[tokenDocsLoader] loadTokenDocs("${branch}") error:`, e);
    return {};
  }
};

export const listAIBranches = async (): Promise<BranchItem[]> => {
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/matching-refs/heads/ai/`;
    console.log('[tokenDocsLoader] Fetching AI branches from:', url);

    const res = await githubFetch(url, 'application/vnd.github.v3+json');

    if (!res.ok) {
      console.warn('[tokenDocsLoader] GitHub API error:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const branches = data
      .map((item: { ref: string }) => ({
        name: item.ref.replace('refs/heads/', '')
      }))
      .sort((a, b) => b.name.localeCompare(a.name));

    console.log('[tokenDocsLoader] Found branches:', branches);
    return branches;

  } catch (e) {
    console.error('[tokenDocsLoader] listAIBranches failed:', e);
    return [];
  }
};

export const loadBranchDiff = async (branch: string): Promise<BranchDiffResult> => {
  const mainDocs = await loadTokenDocs('main');
  const branchDocs = await loadTokenDocs(branch);

  const flattenDocs = (obj: any, path: string = ''): Record<string, string> => {
    const res: Record<string, string> = {};
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return res;
    
    if (obj.description && typeof obj.description === 'string') {
      res[path] = obj.description;
    }
    
    for (const key in obj) {
      if (key !== 'description') {
        const newPath = path ? `${path}.${key}` : key;
        Object.assign(res, flattenDocs(obj[key], newPath));
      }
    }
    return res;
  };

  const flatMain = flattenDocs(mainDocs);
  const flatBranch = flattenDocs(branchDocs);
  
  const diffs: DiffItem[] = [];
  for (const key in flatBranch) {
    if (flatBranch[key] !== flatMain[key]) {
      diffs.push({
        path: key,
        original: flatMain[key] || null,
        modified: flatBranch[key]
      });
    }
  }
  return { diffs, fullBranchDocs: branchDocs };
};

export const saveTokenDocs = async (
  newDocs: Record<string, any>, 
  branch: string, 
  message: string
): Promise<SaveResult> => {
  try {
    const res = await fetch('/api/token-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDocs, branch, message }),
    });
    const payload = await res.json().catch(() => ({}));
    return { success: res.ok, error: payload.error };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
};
