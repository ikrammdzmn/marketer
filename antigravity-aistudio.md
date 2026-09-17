# Guide: Transferring Projects & Context from Google AI Studio to Antigravity IDE

This guide explains how to migrate prompts, specs, code, and context from [Google AI Studio](https://aistudio.google.com/) into **Antigravity IDE**, and highlights key differences between the two environments.

---

## 1. Key Differences at a Glance

| Feature | Google AI Studio | Antigravity IDE |
| :--- | :--- | :--- |
| **Interface** | Web-based prompt workbench | Full IDE & pair-programming agent |
| **History Storage** | Saved in Google Account / Drive | Stored **locally** on your computer (`.gemini/antigravity-ide`) |
| **Workspace Access** | Manual copy-pasting / file uploads | Direct access to all workspace files, terminal & git |
| **Input Context Limit** | Up to 1,000,000+ tokens (Gemini Flash / Pro) | Up to 1,000,000 tokens (Gemini 3.7 Flash) |
| **Max Output Limit** | Model dependent (~8k - 64k tokens) | Up to 64k tokens per response |
| **Execution** | Prompt & API Playground only | Directly edits code, runs commands, builds & tests |

---

## 2. Transfer Methods

### Method 1: Save Specs & Plans to Markdown (*Recommended*)
The cleanest workflow is saving your architecture, plans, or chat summaries from AI Studio directly into markdown files in your repository.

1. In **Google AI Studio**, copy the conversation summary, plan, or spec.
2. In your project workspace, create or update a file (e.g. `docs/spec.md`, `plan.md`, or `masterplan.md`).
3. In the **Antigravity Chat**, instruct the assistant:
   ```text
   Please review docs/spec.md and start implementing the tasks outlined in Phase 1.
   ```
4. Antigravity will automatically inspect the markdown file, understand the context, and execute the changes.

---

### Method 2: Transfer Code Files Directly into the Workspace
If you generated starter scripts or code snippets in AI Studio:

1. Copy the code from AI Studio.
2. Save it directly into its target path in the project folder (e.g., `src/`, `scripts/`, etc.).
3. Ask Antigravity in chat to review, refactor, add tests, or execute the code:
   ```text
   I've added src/service.ts from AI Studio. Please review it, fix any missing imports, and run tests.
   ```

---

### Method 3: Move System Instructions to `AGENTS.md`
If you configured custom **System Instructions** in AI Studio that you want Antigravity to always follow:

1. Create or open `AGENTS.md` (or `GEMINI.md`) in your project root or `.agents/rules/`.
2. Paste your system instructions into this file.
3. Antigravity automatically detects and applies rules defined in `AGENTS.md` to all interactions in the workspace.

---

### Method 4: Direct Prompt & Context Handoff
For quick transitions without saving files first:

1. Copy the final response or full prompt history from AI Studio.
2. Paste it into the Antigravity chat with a prompt:
   ```text
   Here is the planning conversation from AI Studio:
   [PASTE CHAT / SUMMARY]

   Let's continue from here and begin the implementation in this repository.
   ```

---

## 3. Best Practices for Antigravity

* **Leverage the 1M Token Context Window:** You can pass full log files, large documentation, or multiple code files without worrying about context limits.
* **Use File References (`@` syntax):** Type `@` in chat or reference relative file paths to immediately point the agent to specific files.
* **Let the Agent Execute:** Unlike AI Studio where code is only generated as text, Antigravity can directly create files, edit diffs, execute shell commands, run tests, and spin up dev servers.
