# CiviCode

Next.js app for municipal-code retrieval and chat (RAG flow with Gemini + Chroma + Municode MCP).

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create or edit `.env.local` in the project root.
3. Fill in the keys in `.env.local` (see details below).
4. Start dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Use `.env.local` for local development. Never commit real secrets.

### Required

- `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`): API key for embeddings/chat.

### Optional / Config

- `GOOGLE_GENERATIVE_AI_API_KEY`: Alternative Gemini key name used by Google SDKs.
- `GOOGLE_API_KEY`: Additional fallback key name read by the app.
- `OPENAI_API_KEY`: Reserved for future use.
- `MAX_EMBED_REQUESTS_PER_STORE`: Limits chunk embedding requests during store operations.
- `CHROMA_API_KEY`: Chroma Cloud API key.
- `CHROMA_TENANT`: Chroma Cloud tenant ID.
- `CHROMA_DATABASE`: Chroma Cloud database name.
- `CHROMA_COLLECTION`: Collection name used for vector storage/query.
- `CHROMA_URL`: Local/self-hosted Chroma URL (if applicable in your workflow).
- `CHROMA_COLLECTION_NAME`: Local collection name (if you are using local Chroma flow).
- `MCP_PYTHON_PATH`: Python executable path for the Municode MCP server.
- `MCP_SERVER_PATH`: Path to the Municode MCP server script.
- `NODE_ENV`: Runtime mode (usually `development` locally).
- `NEXT_PUBLIC_APP_URL`: Public app base URL (usually `http://localhost:3000` locally).

## How To Get The Keys

### Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API key**.
4. Copy the key into `.env.local` as `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`).

### Chroma Cloud credentials (if using Chroma Cloud)

1. Go to [Chroma Cloud](https://www.trychroma.com/).
2. Create/sign in to your account.
3. Create a project/database.
4. Copy:
   - API key -> `CHROMA_API_KEY`
   - Tenant ID -> `CHROMA_TENANT`
   - Database name -> `CHROMA_DATABASE`
5. Set your collection name in `CHROMA_COLLECTION`.

### OpenAI API key (only if you enable OpenAI paths)

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys).
2. Create a new secret key.
3. Add it to `.env.local` as `OPENAI_API_KEY`.

## Security Notes

- Do not commit `.env.local`.
- Rotate keys immediately if they are ever exposed.
