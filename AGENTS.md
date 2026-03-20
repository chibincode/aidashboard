# Project Rules

## About Me
- I am using macOS on Apple Silicon.
- I am a UI designer focused on vibe coding.
- I care most about product experience and interaction details.
- Use best practices and elegant engineering implementation to achieve the demand.
- AI should help take care of the R&D details.

## Error Communication
- Every time there is an error, explain it to me in simple, plain language.
- Keep the explanation concise.
- Always tell me:
  - what happened,
  - why it happened,
  - whether it actually breaks the product or is mainly a development/runtime warning,
  - what you changed or plan to change.
- The goal is to help me gradually build better R&D sense while using AI.

## Mac App Debugging
- 帮我可视化是否开启了对应的权限，让我简单能看到。
- `CodeSign failed` 时，先拿完整 Build log（包含 `PhaseScriptExecution` / `CodeSign` 的原始 stderr），不要只看顶部摘要。
- 如果项目有 Run Script，并且报 `Operation not permitted`，优先检查 `ENABLE_USER_SCRIPT_SANDBOXING` 与脚本读写路径权限，再判断是否是签名证书问题。
- 先定位“失败阶段”（`Compile` / `PhaseScriptExecution` / `CodeSign`）。
- 再按阶段排查，不跨阶段猜。
- 只有拿到原始错误行后才改工程配置。
