import type { Plugin } from 'vite';

function readBody(request: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk: Buffer) => { body += chunk.toString('utf8'); });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

export function githubTokenDocsPlugin(): Plugin {
  return {
    name: 'caba-token-docs-api',
    configureServer(server) {
      server.middlewares.use('/api/token-docs', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: 'Methode non autorisee' }));
          return;
        }

        const token = process.env.STORYBOOK_GITHUB_TOKEN;
        if (!token) {
          response.statusCode = 503;
          response.end(JSON.stringify({ error: 'STORYBOOK_GITHUB_TOKEN manque sur le serveur Storybook local' }));
          return;
        }

        try {
          const { newDocs, branch, message } = JSON.parse(await readBody(request));
          if (!branch || !(branch === 'main' || String(branch).startsWith('ai/'))) throw new Error('Branche non autorisee');
          const owner = process.env.STORYBOOK_GITHUB_OWNER || 'tjovy';
          const repo = process.env.STORYBOOK_GITHUB_REPO || 'ds-documentation-caba';
          const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/tokens-docs.json`;
          const headers = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          };
          const metadata = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers });
          if (!metadata.ok) throw new Error(`Lecture GitHub impossible (${metadata.status})`);
          const file = await metadata.json();
          const content = Buffer.from(JSON.stringify(newDocs, null, 2), 'utf8').toString('base64');
          const update = await fetch(endpoint, {
            method: 'PUT', headers,
            body: JSON.stringify({ message, content, branch, sha: file.sha }),
          });
          if (!update.ok) throw new Error(`Ecriture GitHub impossible (${update.status})`);
          response.statusCode = 200;
          response.end(JSON.stringify({ success: true }));
        } catch (error: any) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: error?.message || 'Erreur inconnue' }));
        }
      });
    },
  };
}
