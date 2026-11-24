---
type: regex
target: { source: file, path: public/index.html }
pattern: 'atob\(|Buffer\.from\('
match: not_contains
---
