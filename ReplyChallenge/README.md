# ReplyChallenge — environment notes

This service expects an OpenAI API key to use the OpenAI client.

How to set it up locally

1. Create a `.env` file in the `ReplyChallenge` folder (or at repository root) with the following contents:

```
OPENAI_API_KEY=your_openai_api_key_here
```

2. If you prefer not to use a `.env` file, you can set a system environment variable instead:

macOS / zsh:

```
export OPENAI_API_KEY=your_openai_api_key_here
```

Notes
- The application will start even when `OPENAI_API_KEY` is missing, but any request that needs OpenAI will return a helpful error message.
- Use the provided `.env.example` as a template.
