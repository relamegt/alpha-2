const axios = require('axios');

class GithubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.org = process.env.GITHUB_ORG;
    this.apiBase = 'https://api.github.com';
  }

  get headers() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AlphaLearn-App'
    };
  }

  async publishProject(repoName, files) {
    if (!this.token) throw new Error('GITHUB_TOKEN not configured in environment.');
    
    // 1. Ensure Repo Exists
    let repo;
    try {
      const res = await axios.get(`${this.apiBase}/repos/${this.org}/${repoName}`, { headers: this.headers });
      repo = res.data;
    } catch (err) {
      if (err.response?.status === 404) {
        // 2. Try to create as ORG repository
        try {
          const createRes = await axios.post(`${this.apiBase}/orgs/${this.org}/repos`, {
            name: repoName,
            private: false,
            auto_init: true
          }, { headers: this.headers });
          repo = createRes.data;
        } catch (orgErr) {
          // 3. If ORG fails, try to create as USER repository (for personal accounts)
          if (orgErr.response?.status === 404 || orgErr.response?.status === 403) {
            const userRes = await axios.post(`${this.apiBase}/user/repos`, {
              name: repoName,
              private: false,
              auto_init: true
            }, { headers: this.headers });
            repo = userRes.data;
          } else {
            throw orgErr;
          }
        }
      } else {
        throw err;
      }
    }

    // 2. Upload Files
    // To handle multiple files properly via API without Git CLI, we iterate and PUT
    // In a production app, we'd use the Git trees API for a single commit, 
    // but for this assignment builder, sequential PUTs on a small set of files are reliable.
    for (const [path, content] of Object.entries(files)) {
       await this.uploadFile(repoName, path, content);
    }

    return {
      repoUrl: repo.html_url,
      zipUrl: `${repo.html_url}/archive/refs/heads/main.zip`
    };
  }

  async uploadFile(repoName, path, content) {
    const url = `${this.apiBase}/repos/${this.org}/${repoName}/contents/${path}`;
    
    let sha;
    try {
      const res = await axios.get(url, { headers: this.headers });
      sha = res.data.sha;
    } catch (e) {
      // File doesn't exist, sha remains undefined
    }

    await axios.put(url, {
      message: 'Update from AlphaLearn IDE',
      content: Buffer.from(content).toString('base64'),
      sha: sha
    }, { headers: this.headers });
  }
}

module.exports = new GithubService();
