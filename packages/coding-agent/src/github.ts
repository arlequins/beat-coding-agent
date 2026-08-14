export type GitHubRepositoryRef = {
  defaultBranch: string;
  fullName: string;
  id: number;
  updatedAt?: string;
  url: string;
};

export type GitHubFileEvidence = {
  content: string;
  path: string;
  sha: string;
  url: string;
};

/** Read-only by construction. Implementations must not expose write methods. */
export type GitHubReadOnlyPort = {
  getFile(input: {
    owner: string;
    path: string;
    repo: string;
    ref?: string;
  }): Promise<GitHubFileEvidence>;
  getRepository(input: {
    owner: string;
    repo: string;
  }): Promise<GitHubRepositoryRef>;
};

export function createGitHubReadOnlyClient(input: {
  apiUrl?: string;
  token: string;
}): GitHubReadOnlyPort {
  const baseUrl = (input.apiUrl ?? "https://api.github.com").replace(/\/$/, "");
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${input.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    if (!response.ok)
      throw new Error(`GitHub read failed (${response.status})`);
    return (await response.json()) as T;
  }
  return {
    async getFile({ owner, path, repo, ref }) {
      const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const result = await get<{
        content?: string;
        encoding?: string;
        html_url?: string;
        path: string;
        sha: string;
      }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}${query}`,
      );
      if (result.encoding !== "base64" || !result.content)
        throw new Error("GitHub file response was not base64 encoded");
      return {
        content: Buffer.from(
          result.content.replace(/\n/g, ""),
          "base64",
        ).toString("utf8"),
        path: result.path,
        sha: result.sha,
        url:
          result.html_url ??
          `${baseUrl}/repos/${owner}/${repo}/contents/${path}`,
      };
    },
    async getRepository({ owner, repo }) {
      const result = await get<{
        default_branch: string;
        html_url: string;
        id: number;
        full_name: string;
        updated_at?: string;
      }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
      return {
        defaultBranch: result.default_branch,
        fullName: result.full_name,
        id: result.id,
        updatedAt: result.updated_at,
        url: result.html_url,
      };
    },
  };
}

export function parseRepositoryName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner, repo, extra] = fullName.trim().split("/");
  if (!owner || !repo || extra)
    throw new Error("Repository must use owner/name format");
  return { owner, repo };
}
