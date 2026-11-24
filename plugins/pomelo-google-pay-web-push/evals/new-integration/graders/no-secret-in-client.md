---
type: regex
target: { source: file, path: public/index.html }
pattern: 'client_secret|POMELO_CLIENT_SECRET'
flags: i
match: not_contains
---
