## Export full chat history to a downloadable file

The 4 staged batch files in `/tmp/chat_export/` only cover ~331 lines and don't represent the full 477-message history. I'll regenerate a complete export rather than just concatenate the partial batches.

### Steps

1. **Pull full history** — iterate through all messages (1–477) using `chat_search--read_chat_messages` in 20-message windows.
2. **Format as markdown** — for each message: heading with role + timestamp, then body. Skip tool-call noise; keep user messages verbatim and assistant prose.
3. **Write output** — single file at `/mnt/documents/locus-chat-export.md`.
4. **Deliver** — emit a `<lov-artifact>` tag so you can download it directly from chat.

### Notes

- Output will be one self-contained `.md` file (likely 200–500 KB).
- No code changes to the project; this is a pure data-export task.
- After approval I'll switch to build mode and run the export script.
