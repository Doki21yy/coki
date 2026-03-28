#!/usr/bin/env node
// Build digest page from follow-builders feed data and push to GitHub
// Token passed via GITHUB_TOKEN env var
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('Set GITHUB_TOKEN env var'); process.exit(1); }

const SKILL_DIR = '/Users/doki/.openclaw/workspace-coki/skills/follow-builders';
const REPO = 'Doki21yy/coki';
const BRANCH = 'main';

function api(method, urlPath, data) {
  const opts = { method, headers: { 'Authorization': `token ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'coki-digest' }};
  if (data) opts.body = JSON.stringify(data);
  const curl = ['curl','-s','-X',method,'-H',`Authorization: token ${TOKEN}`,'-H','User-Agent: coki'];
  if (data) curl.push('-d', JSON.stringify(data));
  curl.push(`https://api.github.com/repos/${REPO}/${urlPath}`);
  return JSON.parse(execSync(curl.join(' ')).toString());
}

function upsertFile(filePath, content, message) {
  const encoded = Buffer.from(content).toString('base64');
  let sha = null;
  try {
    const existing = JSON.parse(execSync(`curl -s -H "Authorization: token ${TOKEN}" -H "User-Agent: coki" "https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}"`).toString());
    sha = existing.sha;
  } catch {}
  const payload = { message, content: encoded, branch: BRANCH };
  if (sha) payload.sha = sha;
  return api('PUT', `contents/${filePath}`, payload);
}

function esc(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function initials(name) {
  return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

// Load feed data
const xData = JSON.parse(fs.readFileSync(path.join(SKILL_DIR,'feed-x.json'),'utf8'));
const podcastsData = JSON.parse(fs.readFileSync(path.join(SKILL_DIR,'feed-podcasts.json'),'utf8'));

const now = new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});

const tmpl = fs.readFileSync('/tmp/coki-repo/digest/template.html','utf8');

const builders = (xData.x||[]).slice(0,15).map(b => {
  const top = (b.tweets||[]).slice(0,3);
  const content = top.map(t => {
    const text = esc(t.text||'').slice(0,400);
    const long = (t.text||'').length > 400;
    const likes = t.likes > 0 ? `<div class="eng-item">❤️ ${t.likes}</div>` : '';
    const rts = t.retweets > 0 ? `<div class="eng-item">🔁 ${t.retweets}</div>` : '';
    return `<blockquote>${text}${long?'...':''}</blockquote><div class="engagement">${likes}${rts}</div>`;
  }).join('');
  const avatar = initials(b.name);
  return { name: esc(b.name), role: esc((b.bio||'').split('\n')[0].slice(0,80)), avatar, content,
           url: top[0] ? esc(top[0].url) : '#' };
});

let html = tmpl
  .replace('{{title}}', 'AI Builders Digest')
  .replace('{{date}}', now)
  .replace('{{builderCount}}', String(xData.x?.length||0))
  .replace('{{tweetCount}}', String(xData.stats?.totalTweets||0))
  .replace('{{podcastCount}}', String(podcastsData.stats?.podcastEpisodes||0))
  .replace('{{blogCount}}', '0')
  .replace('{{generatedAt}}', now)
  .replace(/\{\{#xBuilders\}\}([\s\S]*?)\{\{\/xBuilders\}\}/, (_, inner) =>
    builders.map(b => inner.replace('{{avatar}}',b.avatar).replace('{{name}}',b.name).replace('{{role}}',b.role).replace('{{{content}}}',b.content).replace('{{url}}',b.url)).join(''))
  .replace(/\{\{#podcasts\}\}[\s\S]*?\{\{\/podcasts\}\}//g,'')
  .replace(/\{\{#blogs\}\}[\s\S]*?\{\{\/blogs\}\}//g,'');

const outPath = '/tmp/coki-repo/digest/latest.html';
fs.mkdirSync(path.dirname(outPath), {recursive:true});
fs.writeFileSync(outPath, html);
console.log('Built:', outPath);

const result = upsertFile('digest/latest.html', html, `Update digest — ${now}`);
console.log('Pushed:', result.commit?.sha || result.message || 'done');
console.log('→ https://github.com/Doki21yy/coki/blob/main/digest/latest.html');
