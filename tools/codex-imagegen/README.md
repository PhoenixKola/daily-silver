# codex-imagegen (vendored)

Source: https://github.com/Adamdesgns/codex-imagegen, revision f2727db, MIT (see LICENSE).
File: skills/codex-imagegen/scripts/imagegen.mjs, audited: zero dependencies, no shell, spawns only the Codex CLI,
read-only sandbox, shell/browser/computer-use/apps/plugins/multi-agent disabled, ephemeral session, ignores user config.

Local modification (the only one): optional `--model NAME`, passed as `codex exec -m NAME` and recorded in the log.
Invoking model is recorded separately from the internal image model, which Codex does not report.

Codex on this machine: C:\Users\<user>\AppData\Local\OpenAI\Codex\bin\<hash>\codex.exe (pass with --codex or CODEX_BIN).
Uses the existing ChatGPT/Codex sign-in; no API key. Each call spends Codex allowance.
